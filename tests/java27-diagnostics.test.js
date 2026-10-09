// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const filename = path.join(__dirname, "..", "test-fixtures", "java27", "verify.mjs");
const source = fs.readFileSync(filename, "utf8").replace(/^import .+;\r?\n/gm, "").replace("import.meta.url", "fixtureUrl");

function execute(platform, options = {}) {
    const paths = platform === "win32" ? path.win32 : path.posix;
    const root = platform === "win32" ? "C:\\CI Tools" : "/ci/tools with spaces";
    const workspace = paths.join(root, "workspace");
    const javaHome = paths.join(root, "jdk-27");
    const ciGradle = paths.join(root, "gradle-9.8.1", "bin", platform === "win32" ? "gradle.bat" : "gradle");
    const diagnosticDirectory = paths.join(root, "results", "terminal");
    const calls = [];
    const files = new Map();
    const messages = [];
    let monitor;
    let classWritten = false;
    const bytecode = Buffer.alloc(8);
    bytecode.writeUInt32BE(0xcafebabe);
    bytecode.writeUInt16BE(options.bytecodeMajor ?? 71, 6);
    const state = {
        paths, workspace, javaHome, ciGradle, diagnosticDirectory, calls, files, messages,
        run: () => {
            try {
                vm.runInNewContext(source, {
                    assert, Buffer, path: paths, fixtureUrl: "file:///verify.mjs",
                    fileURLToPath: () => paths.join(workspace, "verify.mjs"),
                    mkdirSync: () => {},
                    writeFileSync: (location, content) => files.set(location, content),
                    readFileSync: () => bytecode,
                    existsSync: () => classWritten,
                    console: { log: message => messages.push(message) },
                    process: {
                        argv: ["node", filename, "gradle", "project"],
                        platform, arch: platform === "darwin" ? "arm64" : "x64",
                        execPath: paths.join(root, "terminal-node"), version: "v24.20.0",
                        env: {
                            PATH: paths.join(root, "terminal-tools"),
                            JAVA_HOME: paths.join(root, "jdk-21"),
                            JAVA27_HOME: javaHome,
                            JAVA27_DIAGNOSTICS_DIR: options.diagnostics === false ? undefined : diagnosticDirectory,
                            JAVA27_CI_GRADLE: options.ciGradle ?? ciGradle,
                        },
                        on: (event, callback) => { if (event === "uncaughtExceptionMonitor") monitor = callback; },
                    },
                    spawnSync: (command, args, spawnOptions) => {
                        calls.push({ command, args, options: spawnOptions });
                        const invocation = command === "cmd.exe" ? args[3] : command;
                        const control = invocation.includes(ciGradle);
                        if (args.includes("-XshowSettings:properties")) {
                            return { status: 0, stdout: "", stderr: "java.specification.version = 27\n" };
                        }
                        if (command === "/usr/bin/which" || invocation === "where gradle") {
                            return { status: 0, stdout: paths.join(root, "terminal-tools", "gradle"), stderr: "" };
                        }
                        if (args.includes("--enable-preview")) {
                            return { status: options.applicationStatus ?? 0, stdout: "JDK27_PROJECT:27\n", stderr: "" };
                        }
                        if (args.includes("--version") || invocation.endsWith("--version")) {
                            return { status: 0, stdout: `Gradle ${control ? "9.8.1" : "9.7.1"}\n`, stderr: "" };
                        }
                        if (!control && options.spawnError) {
                            return { status: null, error: options.spawnError, stdout: "", stderr: "Cannot start PATH Gradle\n" };
                        }
                        const status = control ? (options.controlStatus ?? 0) : (options.buildStatus ?? 0);
                        if (status === 0) classWritten = true;
                        return {
                            status, stdout: status === 0 ? "BUILD SUCCESSFUL\n" : "",
                            stderr: status === 0 ? "" : "Original Gradle compilation error\nComplete stacktrace\n",
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
    test(`${platform} keeps the primary PATH Gradle and records terminal identity`, () => {
        const s = execute(platform);
        s.run();
        const build = s.calls.find(call => call.args.join(" ").includes("clean classes"));
        if (platform === "win32") {
            assert.equal(build.args[3], "gradle --no-daemon --console=plain clean classes --stacktrace --info");
            assert.equal(build.options.windowsVerbatimArguments, false);
        } else {
            assert.equal(build.command, "gradle");
        }
        assert.equal(build.options.env.JAVA_HOME, s.javaHome);
        const identity = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "terminal-toolchain.json")));
        assert.equal(identity.nodeVersion, "v24.20.0");
        assert.equal(identity.ciGradle, s.ciGradle);
        assert.equal(identity.inheritedJavaHome, s.paths.join(platform === "win32" ? "C:\\CI Tools" : "/ci/tools with spaces", "jdk-21"));
        assert.equal(identity.projectJavaHome, s.javaHome);
        assert.ok(s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-project-build.log")));
        assert.ok(s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-path-version.log")));
        assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
        assert.ok(s.messages.includes("JDK27_PROJECT_PASSED"));
    });

    test(`${platform} successful CI control cannot turn the original failure into a pass`, () => {
        const s = execute(platform, { buildStatus: 1 });
        assert.throws(s.run, /Original Gradle compilation error/);
        const report = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
        assert.equal(report.primaryStatus, 1);
        assert.equal(report.controlStatus, 0);
        assert.equal(report.bytecodeMajor, 71);
        assert.equal(report.verified, true);
        const control = s.calls.find(call => call.args.join(" ").includes("clean classes") &&
            (call.command === s.ciGradle || call.args[3]?.includes(s.ciGradle)));
        assert.equal(control.options.env.JAVA_HOME, s.javaHome);
        if (platform === "win32") {
            assert.equal(control.args[3], `""${s.ciGradle}" --no-daemon --console=plain clean classes --stacktrace --info"`);
            assert.equal(control.options.windowsVerbatimArguments, true);
        }
        assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
        assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "failure.log")), /Original Gradle compilation error/);
        assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-project-build.log")), /Complete stacktrace/);
    });
}

test("diagnostics remain opt-in and preserve the original command and success marker", () => {
    const s = execute("darwin", { diagnostics: false });
    s.run();
    assert.equal(s.calls.length, 3);
    assert.equal(s.calls[1].command, "gradle");
    assert.deepEqual(Array.from(s.calls[1].args), ["--no-daemon", "--console=plain", "clean", "classes"]);
    assert.ok(s.messages.includes("JDK27_PROJECT_PASSED"));
    assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "terminal-toolchain.json")));
});

for (const [name, options] of [
    ["failed control build", { controlStatus: 1 }],
    ["wrong control bytecode", { bytecodeMajor: 70 }],
    ["failed control application", { applicationStatus: 1 }],
]) {
    test(`${name} is explicit and does not hide the primary failure`, () => {
        const s = execute("darwin", { buildStatus: 1, ...options });
        assert.throws(s.run, /Original Gradle compilation error/);
        const report = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
        assert.equal(report.primaryStatus, 1);
        assert.equal(report.verified, false);
        assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
    });
}

test("a spawn error retains the original exception and persistent command metadata", () => {
    const s = execute("darwin", { spawnError: Object.assign(new Error("ENOENT"), { code: "ENOENT" }) });
    assert.throws(s.run, /ENOENT/);
    const metadata = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-project-build.log.json")));
    assert.equal(metadata.status, null);
    assert.equal(metadata.error.code, "ENOENT");
    assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "failure.log")), /ENOENT/);
    assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
});

test("relative CI control paths are rejected instead of silently using PATH again", () => {
    const s = execute("darwin", { ciGradle: "gradle" });
    assert.throws(s.run, /absolute JAVA27_CI_GRADLE/);
    assert.equal(s.calls.length, 0);
});
