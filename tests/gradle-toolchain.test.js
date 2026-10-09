// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "test-fixtures", "gradle-import", "verify.mjs");
const source = fs.readFileSync(filename, "utf8").replace(/^import .+;\r?\n/gm, "").replace("import.meta.url", "fixtureUrl");

function execute(platform, release = "21", options = {}) {
    const paths = platform === "win32" ? path.win32 : path.posix;
    const root = platform === "win32" ? "C:\\CI Tools" : "/ci/tools with spaces";
    const workspace = paths.join(root, "workspace");
    const javaHome = paths.join(root, `jdk-${release}`);
    const gradle = paths.join(root, "gradle", "bin", platform === "win32" ? "gradle.bat" : "gradle");
    const logDirectory = paths.join(root, "results", "toolchain");
    const gradleVersion = release === "21" ? "8.5" : "9.8.1";
    const calls = [];
    const files = new Map();
    const messages = [];
    let monitor;
    const bytecode = Buffer.alloc(8);
    bytecode.writeUInt32BE(0xcafebabe);
    bytecode.writeUInt16BE(options.bytecodeMajor ?? Number(release) + 44, 6);
    const bound = options.bound !== false;
    const argv = ["node", filename, release, gradleVersion];
    if (bound) argv.push(options.gradle ?? gradle, javaHome, logDirectory);
    const state = {
        paths, gradle, javaHome, logDirectory, calls, files, messages,
        run: () => {
            try {
                vm.runInNewContext(source, {
                    assert, path: paths, fixtureUrl: "file:///verify.mjs",
                    fileURLToPath: () => paths.join(workspace, "verify.mjs"),
                    mkdirSync: () => {},
                    writeFileSync: (location, content) => files.set(location, content),
                    readFileSync: () => bytecode,
                    console: { log: message => messages.push(message) },
                    process: {
                        argv, platform, execPath: paths.join(root, "node"), version: "v22.23.2",
                        env: {
                            PATH: paths.join(root, "wrong-tools"),
                            JAVA_HOME: paths.join(root, "wrong-jdk"),
                            [`JAVA${release}_HOME`]: bound ? paths.join(root, "wrong-jdk") : javaHome,
                            GITHUB_ACTIONS: options.ci === false ? undefined : "true",
                            ORG_GRADLE_PROJECT_javaRelease: "projectRelease" in options ? options.projectRelease : release,
                        },
                        on: (event, callback) => { if (event === "uncaughtExceptionMonitor") monitor = callback; },
                    },
                    spawnSync: (command, args, spawnOptions) => {
                        calls.push({ command, args, options: spawnOptions });
                        if (calls.length === 1) {
                            return { status: 0, stdout: "", stderr: `    java.specification.version = ${options.javaRelease ?? release}\n` };
                        }
                        if (calls.length === 2) {
                            return { status: 0, stdout: `Gradle ${options.gradleVersion ?? gradleVersion}\n`, stderr: "" };
                        }
                        if (options.spawnError) {
                            return { error: options.spawnError, stdout: "", stderr: "Could not start Gradle\n" };
                        }
                        return {
                            status: options.buildStatus ?? 0,
                            stdout: options.output ?? `GRADLE_PROJECT:${release}:GRADLE\n`,
                            stderr: options.stderr ?? "",
                        };
                    },
                }, { filename });
            } catch (error) {
                if (monitor) monitor(error);
                throw error;
            }
        },
    };
    return state;
}

for (const platform of ["win32", "linux", "darwin"]) {
    for (const release of ["21", "25"]) {
        test(`${platform} Java ${release} uses bound tools despite conflicting PATH and JDK environment`, () => {
            const s = execute(platform, release);
            s.run();
            assert.equal(s.calls[0].command, s.paths.join(s.javaHome, "bin", platform === "win32" ? "java.exe" : "java"));
            assert.equal(s.calls[0].options.env.JAVA_HOME, s.javaHome);
            assert.equal(s.calls[2].options.env.JAVA_HOME, s.javaHome);
            if (platform === "win32") {
                assert.equal(s.calls[1].command, "cmd.exe");
                assert.equal(s.calls[1].args[3], `""${s.gradle}" --version"`);
                assert.equal(s.calls[1].options.windowsVerbatimArguments, true);
            } else {
                assert.equal(s.calls[1].command, s.gradle);
                assert.equal(s.calls[2].command, s.gradle);
            }
            const identity = JSON.parse(s.files.get(s.paths.join(s.logDirectory, "toolchain.json")));
            assert.equal(identity.gradle, s.gradle);
            assert.equal(identity.javaHome, s.javaHome);
            assert.equal(identity.projectJavaRelease, release);
            assert.ok(s.files.has(s.paths.join(s.logDirectory, "build-and-run.log")));
            const commands = [1, 2, 3].map(number =>
                JSON.parse(s.files.get(s.paths.join(s.logDirectory, `command-${number}.json`))));
            assert.deepEqual(commands.map(command => command.stage), ["java-version", "gradle-version", "build-and-run"]);
            assert.equal(commands[2].exitCode, 0);
            assert.equal(commands[2].javaHome, s.javaHome);
            assert.deepEqual(commands[2].args, Array.from(s.calls[2].args));
            assert.equal(JSON.parse(s.files.get(s.paths.join(s.logDirectory, "stage.json"))).stage, "passed");
            assert.ok(s.messages.includes(`GRADLE_JAVA${release}_BUILD_PASSED`));
        });
    }
}

test("CI cannot silently fall back to PATH without explicit toolchain arguments", () => {
    const s = execute("darwin", "21", { bound: false });
    assert.throws(s.run, /CI requires explicit Gradle, JDK and diagnostic paths/);
    assert.equal(s.calls.length, 0);
});

test("relative bound executable paths are rejected before any command runs", () => {
    const s = execute("linux", "21", { gradle: "gradle" });
    assert.throws(s.run, /Expected an absolute toolchain path/);
    assert.equal(s.calls.length, 0);
});

for (const projectRelease of [undefined, "21"]) {
    test(`Java 25 CI rejects a ${projectRelease === undefined ? "missing" : "conflicting"} shared project release`, () => {
        const s = execute("darwin", "25", { projectRelease });
        assert.throws(s.run, /CI requires javaRelease=25 to be shared with the IDE/);
        assert.equal(s.calls.length, 0);
        assert.match(s.files.get(s.paths.join(s.logDirectory, "failure.log")), /CI requires javaRelease=25/);
        assert.ok(!s.messages.includes("GRADLE_JAVA25_BUILD_PASSED"));
    });
}

test("local two-argument calls preserve PATH Gradle and project JDK environment behavior", () => {
    const s = execute("linux", "21", { bound: false, ci: false });
    s.run();
    assert.equal(s.calls[1].command, "gradle");
    assert.equal(s.calls[0].options.env.JAVA_HOME, s.javaHome);
});

for (const [name, options, expected] of [
    ["wrong Gradle version", { gradleVersion: "9.7.1" }, /Gradle 9\.7\.1/],
    ["wrong JDK release", { javaRelease: "25" }, /java\.specification\.version = 25/],
    ["failed build", { buildStatus: 1, stderr: "Build failed\n" }, /Build failed/],
    ["wrong program output", { output: "Unexpected output\n" }, /Unexpected output/],
    ["wrong bytecode", { bytecodeMajor: 69 }, /Wrong target Java bytecode/],
    ["spawn failure", { spawnError: new Error("ENOENT") }, /ENOENT/],
]) {
    test(`${name} remains a failure and preserves diagnostics outside the temporary workspace`, () => {
        const s = execute("darwin", "21", options);
        assert.throws(s.run, expected);
        assert.ok(s.files.has(s.paths.join(s.logDirectory, "toolchain.json")));
        assert.match(s.files.get(s.paths.join(s.logDirectory, "failure.log")), expected);
        const failure = JSON.parse(s.files.get(s.paths.join(s.logDirectory, "failure.json")));
        assert.match(failure.message, expected);
        assert.ok(failure.stage);
        assert.match(failure.stack, expected);
        assert.ok(!s.messages.includes("GRADLE_JAVA21_BUILD_PASSED"));
    });
}

for (const plan of ["java-gradle", "java-gradle-java25"]) {
    test(`${plan} verifies the reloaded probe before consuming completion`, () => {
        const content = fs.readFileSync(path.join(__dirname, "..", "test-plans", `${plan}.yaml`), "utf8");
        const ids = [...content.matchAll(/^\s*- id: "([^"]+)"/gm)].map(match => match[1]);
        assert.match(content, /java\.gradle\.buildServer\.enabled: "on"/);
        assert.ok(ids.indexOf("ls-ready") < ids.indexOf("show-gradle-task-model"));
        assert.ok(ids.indexOf("show-gradle-task-model") < ids.indexOf("expand-gradle-tasks"));
        assert.ok(ids.indexOf("expand-gradle-tasks") < ids.indexOf("verify-gradle-build-task"));
        assert.ok(ids.indexOf("insert-dependency-probe") < ids.indexOf("reload-dependency-probe"));
        assert.ok(ids.indexOf("reload-dependency-probe") < ids.indexOf("verify-dependency-completion"));
        assert.ok(ids.indexOf("remove-dependency-probe") < ids.indexOf("save-source"));
        assert.ok(ids.indexOf("save-source") < ids.indexOf("verify-build-and-run"));
        assert.ok(ids.indexOf("verify-gradle-model-remains-healthy") > ids.indexOf("verify-build-and-run"));
    });
}
