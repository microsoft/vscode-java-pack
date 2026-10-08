import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function run(command, args, logName) {
    const result = spawnSync(command, args, {
        cwd: workspace,
        env,
        encoding: "utf8",
        timeout: 240_000,
        maxBuffer: 16 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    writeFileSync(path.join(logDirectory, logName), output);
    if (result.error) throw result.error;
    assert.notEqual(result.status, null, `Process terminated by ${result.signal}: ${output}`);
    return { status: result.status, output, stdout: result.stdout };
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

const command = builder === "maven" ? "mvn" : "gradle";
const args = builder === "maven"
    ? ["--batch-mode", "--no-transfer-progress", "--quiet", "clean", "compile"]
    : ["--no-daemon", "--console=plain", "clean", "classes"];
const build = process.platform === "win32"
    ? run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], `${builder}-${scenario}-build.log`)
    : run(command, args, `${builder}-${scenario}-build.log`);
console.log(build.output);

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
