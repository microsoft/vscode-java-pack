import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspace = path.dirname(fileURLToPath(import.meta.url));
const [release, gradleVersion, boundGradle, boundJavaHome, boundLogDirectory] = process.argv.slice(2);
assert.ok(release === "21" || release === "25", "Expected Java 21 or Java 25");
assert.equal(gradleVersion, release === "21" ? "8.5" : "9.8.1", "Unexpected Gradle/JDK pair");
if (process.env.GITHUB_ACTIONS === "true") {
    assert.ok(boundGradle && boundJavaHome && boundLogDirectory, "CI requires explicit Gradle, JDK and diagnostic paths");
}
for (const location of [boundGradle, boundJavaHome, boundLogDirectory]) {
    if (location !== undefined) assert.ok(path.isAbsolute(location), `Expected an absolute toolchain path: ${location}`);
}
const javaHome = boundJavaHome ?? process.env[`JAVA${release}_HOME`];
assert.ok(javaHome, `Set JAVA${release}_HOME to the project JDK`);
const gradleExecutable = boundGradle ?? "gradle";

const env = { ...process.env, JAVA_HOME: javaHome };
const pathKey = Object.keys(env).find(key => key.toLowerCase() === "path") ?? "PATH";
env[pathKey] = `${path.join(javaHome, "bin")}${path.delimiter}${env[pathKey] ?? ""}`;
const java = path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
const logDirectory = boundLogDirectory ?? path.join(workspace, ".autotest");
mkdirSync(logDirectory, { recursive: true });
writeFileSync(path.join(logDirectory, "toolchain.json"), JSON.stringify({
    node: process.execPath,
    nodeVersion: process.version,
    gradle: gradleExecutable,
    gradleVersion,
    javaHome,
    javaRelease: release,
    workspace,
}, null, 2));
process.on("uncaughtExceptionMonitor", error => {
    writeFileSync(path.join(logDirectory, "failure.log"), error.stack ?? String(error));
});
console.log(`Node ${process.version}: ${process.execPath}`);
console.log(`Gradle ${gradleVersion}: ${gradleExecutable}`);
console.log(`JDK ${release}: ${javaHome}`);

function run(command, args, logName, windowsVerbatimArguments = false) {
    const result = spawnSync(command, args, {
        cwd: workspace,
        env,
        encoding: "utf8",
        timeout: 240_000,
        maxBuffer: 16 * 1024 * 1024,
        windowsVerbatimArguments,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    writeFileSync(path.join(logDirectory, logName), output);
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Command failed (${result.status ?? result.signal}): ${output}`);
    return output;
}

function gradle(args, logName) {
    return process.platform === "win32"
        ? run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `""${gradleExecutable}" ${args.join(" ")}"`], logName, true)
        : run(gradleExecutable, args, logName);
}

const javaVersion = run(java, ["-XshowSettings:properties", "-version"], "java-version.log");
assert.match(javaVersion, new RegExp(`java\\.specification\\.version\\s*=\\s*${release}(?:\\r?\\n|$)`));
const toolVersion = gradle(["--version"], "gradle-version.log");
assert.ok(toolVersion.split(/\r?\n/).includes(`Gradle ${gradleVersion}`), toolVersion);

const output = gradle(
    ["--no-daemon", "--console=plain", "--quiet", `-PjavaRelease=${release}`, "clean", "classes", "run"],
    "build-and-run.log",
);
console.log(output);
assert.ok(output.split(/\r?\n/).includes(`GRADLE_PROJECT:${release}:GRADLE`), output);

const bytecode = readFileSync(path.join(workspace, "build", "classes", "java", "main", "example", `GradleSmoke${release}.class`));
assert.equal(bytecode.readUInt32BE(0), 0xcafebabe, "Expected a Java class file");
assert.equal(bytecode.readUInt16BE(6), Number(release) + 44, "Wrong target Java bytecode");
assert.equal(bytecode.readUInt16BE(4), 0, "These cases do not require preview features");
console.log(`GRADLE_JAVA${release}_BUILD_PASSED`);
