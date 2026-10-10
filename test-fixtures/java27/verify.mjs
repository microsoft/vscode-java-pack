import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspace = path.dirname(fileURLToPath(import.meta.url));
const [builder, scenario] = process.argv.slice(2);
const cases = {
    project: ["ProjectSmoke", "JDK27_PROJECT:27", "JDK27_PROJECT_PASSED"],
    patterns: ["PrimitivePatterns", "42|2147483648|42|-1|42|-1", "JDK27_PATTERNS_PASSED"],
    api: ["Java27Apis", "jdk27|jdk27|1|true|false|true|2", "JDK27_API_PASSED"],
    "preview-enabled": ["PrimitivePatterns", "42|2147483648|42|-1|42|-1", "JDK27_PREVIEW_ENABLED_PASSED"],
};
assert.ok(builder === "maven" || builder === "gradle", "Expected maven or gradle");
assert.ok(Object.hasOwn(cases, scenario) || scenario === "preview-disabled", "Unknown scenario");
assert.ok(builder === "maven" || scenario === "project", "Gradle covers project import/build");
assert.ok(process.env.JAVA27_HOME, "Set JAVA27_HOME to a JDK 27 installation");

const env = { ...process.env, JAVA_HOME: process.env.JAVA27_HOME };
const pathKey = Object.keys(env).find(key => key.toLowerCase() === "path") ?? "PATH";
env[pathKey] = `${path.join(env.JAVA_HOME, "bin")}${path.delimiter}${env[pathKey] ?? ""}`;
const java = path.join(env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java");
const logDirectory = path.join(workspace, ".autotest");
mkdirSync(logDirectory, { recursive: true });
const diagnosticDirectory = process.env.JAVA27_DIAGNOSTICS_DIR;
const ciGradle = process.env.JAVA27_CI_GRADLE;
const isCI = process.env.GITHUB_ACTIONS === "true" || process.env.CI === "true";
if (builder === "gradle" && isCI) {
    assert.ok(ciGradle && path.isAbsolute(ciGradle), "CI Gradle builds require an absolute JAVA27_CI_GRADLE");
}
const command = builder === "maven" ? "mvn" : isCI ? ciGradle : "gradle";
if (diagnosticDirectory) {
    assert.ok(path.isAbsolute(diagnosticDirectory), "JAVA27_DIAGNOSTICS_DIR must be absolute");
    mkdirSync(diagnosticDirectory, { recursive: true });
    if (builder === "gradle") {
        assert.ok(ciGradle && path.isAbsolute(ciGradle), "Gradle diagnostics require an absolute JAVA27_CI_GRADLE");
    }
}

function saveLog(name, content) {
    writeFileSync(path.join(logDirectory, name), content);
    if (diagnosticDirectory) writeFileSync(path.join(diagnosticDirectory, name), content);
}

function capture(command, args, logName, windowsVerbatimArguments = false) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(command, args, {
        cwd: workspace,
        env,
        encoding: "utf8",
        timeout: 240_000,
        maxBuffer: 16 * 1024 * 1024,
        windowsVerbatimArguments,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    saveLog(logName, output);
    if (diagnosticDirectory) {
        saveLog(`${logName}.json`, JSON.stringify({
            command, args, cwd: workspace, startedAt,
            completedAt: new Date().toISOString(),
            status: result.status ?? null,
            signal: result.signal ?? null,
            error: result.error ? {
                name: result.error.name,
                message: result.error.message,
                code: result.error.code,
            } : null,
        }, null, 2));
    }
    return { ...result, output };
}

function checkProcess(result) {
    if (result.error) throw result.error;
    assert.notEqual(result.status, null, `Process terminated by ${result.signal}: ${result.output}`);
    return result;
}

function run(command, args, logName) {
    return checkProcess(capture(command, args, logName));
}

function captureBuilder(command, args, logName) {
    if (process.platform !== "win32") return capture(command, args, logName);
    const absolute = path.isAbsolute(command);
    const commandLine = absolute ? `""${command}" ${args.join(" ")}"` : `${command} ${args.join(" ")}`;
    return capture(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], logName, absolute);
}

if (diagnosticDirectory) {
    const identity = {
        builder, scenario, workspace,
        node: process.execPath,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        shell: process.env.SHELL ?? process.env.ComSpec ?? null,
        inheritedJavaHome: process.env.JAVA_HOME ?? null,
        projectJavaHome: env.JAVA_HOME,
        inheritedPath: process.env[pathKey] ?? null,
        childPath: env[pathKey],
        gradleCommand: builder === "gradle" ? command : null,
        ciGradle,
    };
    saveLog("terminal-toolchain.json", JSON.stringify(identity, null, 2));
    process.on("uncaughtExceptionMonitor", error => saveLog("failure.log", error.stack ?? String(error)));
    console.log(`[diagnostic] Logs and terminal toolchain: ${diagnosticDirectory}`);
}

const version = run(java, ["-XshowSettings:properties", "-version"], "java-version.log");
assert.equal(version.status, 0, version.output);
assert.match(version.output, /java\.specification\.version\s*=\s*27(?:\r?\n|$)/);
if (builder === "maven") {
    const pom = readFileSync(path.join(workspace, "pom.xml"), "utf8");
    const expectedPreview = scenario !== "preview-disabled";
    assert.ok(pom.includes(`<maven.compiler.enablePreview>${expectedPreview}</maven.compiler.enablePreview>`),
        `pom.xml must have preview ${expectedPreview ? "enabled" : "disabled"}`);
}

const args = builder === "maven"
    ? ["--batch-mode", "--no-transfer-progress", "--quiet", "clean", "compile"]
    : ["--no-daemon", "--console=plain", "clean", "classes"];
if (diagnosticDirectory && builder === "gradle") {
    args.push("--stacktrace", "--info");
    process.platform === "win32"
        ? capture(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "where gradle"], "gradle-path-lookup.log")
        : capture("/usr/bin/which", ["-a", "gradle"], "gradle-path-lookup.log");
}
const build = captureBuilder(command, args, `${builder}-${scenario}-build.log`);
if (!diagnosticDirectory) console.log(build.output);

if (diagnosticDirectory && builder === "gradle") {
    for (const [executable, name] of [["gradle", "gradle-path-version.log"], [ciGradle, "gradle-ci-version.log"]]) {
        captureBuilder(executable, ["--version"], name);
    }
    // Controls never replace the primary result or emit its success marker.
    if (build.status !== 0 && command !== ciGradle) {
        const control = captureBuilder(ciGradle, args, "gradle-ci-control-build.log");
        const report = {
            primaryStatus: build.status ?? null,
            controlStatus: control.status ?? null,
            controlSignal: control.signal ?? null,
            controlError: control.error?.message ?? null,
            bytecodeMajor: null,
            applicationStatus: null,
            applicationOutput: null,
            verified: false,
        };
        if (!control.error && control.status === 0) {
            const classFile = path.join(workspace, "build", "classes", "java", "main", "example", "ProjectSmoke.class");
            if (existsSync(classFile)) {
                const bytecode = readFileSync(classFile);
                if (bytecode.length >= 8 && bytecode.readUInt32BE(0) === 0xcafebabe) {
                    report.bytecodeMajor = bytecode.readUInt16BE(6);
                }
            }
            const application = capture(java, [
                "--enable-preview", "-cp", path.dirname(path.dirname(classFile)), "example.ProjectSmoke",
            ], "gradle-ci-control-run.log");
            report.applicationStatus = application.status ?? null;
            report.applicationOutput = application.stdout?.trim() ?? null;
            report.verified = report.bytecodeMajor === 71 && !application.error &&
                application.status === 0 && report.applicationOutput === cases.project[1];
        }
        saveLog("gradle-ci-control.json", JSON.stringify(report, null, 2));
        console.log(`[diagnostic] CI Gradle control: exit=${report.controlStatus}; verified=${report.verified}; see ${diagnosticDirectory}`);
    }
}
checkProcess(build);

if (scenario === "preview-disabled") {
    assert.notEqual(build.status, 0, "Compilation must fail with preview disabled");
    assert.match(build.output, /PrimitivePatterns\.java/);
    assert.match(build.output, /primitive patterns are a preview feature and are disabled by default/);
    console.log("JDK27_PREVIEW_DISABLED_CONFIRMED");
} else {
    assert.equal(build.status, 0, build.output);
    const [className, expectedOutput, marker] = cases[scenario];
    const classes = path.join(workspace, builder === "maven" ? "target/classes" : "build/classes/java/main");
    const bytecode = readFileSync(path.join(classes, "example", `${className}.class`));
    assert.equal(bytecode.readUInt16BE(6), 71, "Expected Java 27 bytecode, not an older source release");
    if (scenario !== "project") {
        assert.equal(bytecode.readUInt16BE(4), 65535, "Expected preview bytecode");
    }
    const result = run(java, ["--enable-preview", "-cp", classes, `example.${className}`], `${builder}-${scenario}-run.log`);
    assert.equal(result.status, 0, result.output);
    assert.equal(result.stdout.trim(), expectedOutput);
    console.log(marker);
}
