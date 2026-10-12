// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
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

function prepareBinding(t, release, actualGradleVersion = release === "21" ? "8.5" : "9.8.1") {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gradle tools' "));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const plan = release === "21" ? "java-gradle" : `java-gradle-java${release}`;
    const javaHome = path.join(root, `jdk-${release}`);
    const gradleHome = path.join(root, "gradle");
    const staging = path.join(root, "staging");
    const envFile = path.join(root, "github-env");
    const invocation = path.join(root, "invocation.json");
    const nodeScript = path.join(root, "node.js");
    const node = path.join(root, process.platform === "win32" ? "node.cmd" : "node");
    const gradle = path.join(gradleHome, "bin", process.platform === "win32" ? "gradle.bat" : "gradle");
    for (const directory of [javaHome, path.dirname(gradle), path.join(gradleHome, "lib"), staging, path.join(root, "test-plans")]) {
        fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(envFile, "");
    fs.writeFileSync(nodeScript, `
        if (process.argv[2] === "--version") console.log("v22.23.2");
        else require("node:fs").writeFileSync(process.env.TOOL_BINDING_INVOCATION, JSON.stringify({
            args: process.argv.slice(2), gradle: process.env.JAVA27_CI_GRADLE
        }));
    `);
    const shellQuote = value => "'" + value.replace(/'/g, "'\"'\"'") + "'";
    fs.writeFileSync(node, process.platform === "win32"
        ? `@echo off\r\n"${process.execPath}" "${nodeScript}" %*\r\n`
        : `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(nodeScript)} "$@"\n`,
    { mode: 0o755 });
    fs.writeFileSync(gradle, process.platform === "win32"
        ? `@echo off\r\necho Gradle ${actualGradleVersion}\r\n`
        : `#!/bin/sh\nprintf 'Gradle ${actualGradleVersion}\\n'\n`,
    { mode: 0o755 });
    const original = fs.readFileSync(path.join(__dirname, "..", "test-plans", `${plan}.yaml`), "utf8");
    const planFile = path.join(root, "test-plans", `${plan}.yaml`);
    fs.writeFileSync(planFile, original);
    const env = {
        ...process.env,
        GITHUB_ACTIONS: "true",
        GITHUB_ENV: envFile,
        AUTOTEST_STAGING_DIR: staging,
        [`JAVA${release}_HOME`]: javaHome,
        TOOL_BINDING_NODE: node,
        TOOL_BINDING_GRADLE: gradle,
        TOOL_BINDING_INVOCATION: invocation,
    };
    const script = path.join(__dirname, "..", ".github", "scripts", "bind-gradle-toolchain.ps1");
    const harness = `
        $ErrorActionPreference = "Stop"
        function global:node { $env:TOOL_BINDING_NODE; $global:LASTEXITCODE = 0 }
        function global:Get-Command {
            param($Name, $CommandType, $ErrorAction)
            if ($Name -ne "gradle") { throw "Unexpected command lookup: $Name" }
            [pscustomobject]@{ Source = $env:TOOL_BINDING_GRADLE }
        }
        & '${script.replace(/'/g, "''")}' -PlanName '${plan}'
    `;
    return {
        root, planFile, original, javaHome, gradleHome, gradle, staging, envFile, invocation, env,
        run: () => execFileSync("pwsh", ["-NoProfile", "-NonInteractive", "-OutputFormat", "Text", "-EncodedCommand",
            Buffer.from(harness, "utf16le").toString("base64")], { cwd: root, env, encoding: "utf8", stdio: "pipe" }),
    };
}

for (const release of ["21", "25", "27"]) {
    test(`shared CI binding executes Java ${release} with selected tools and the existing diagnostic staging`, t => {
        const s = prepareBinding(t, release);
        s.run();
        const content = fs.readFileSync(s.planFile, "utf8");
        const prefix = "executeVSCodeCommand workbench.action.terminal.sendSequence ";
        const actionLine = content.split(/\r?\n/).find(line => line.includes(`action: '${prefix}`));
        const action = actionLine.trim().slice("action: '".length, -1).replace(/''/g, "'");
        const command = JSON.parse(action.slice(prefix.length)).text.trimEnd();
        const bindings = Object.fromEntries(fs.readFileSync(s.envFile, "utf8").trim().split(/\r?\n/).map(line => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
        }));
        const env = { ...s.env, ...bindings };
        if (process.platform === "win32") {
            execFileSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", command], { cwd: s.root, env });
        } else {
            execFileSync("/bin/bash", ["--noprofile", "--norc", "-c", command], { cwd: s.root, env });
        }
        const invoked = JSON.parse(fs.readFileSync(s.invocation, "utf8"));
        const diagnostics = path.join(s.staging, "terminal");
        assert.equal(bindings.GRADLE_CI_JAVA_HOME, s.javaHome);
        assert.equal(bindings.GRADLE_CI_GRADLE, s.gradle);
        const homeLine = content.split(/\r?\n/).find(line => line.includes("java.import.gradle.home:"));
        assert.equal(JSON.parse(homeLine.split("java.import.gradle.home:")[1]), s.gradleHome);
        if (release === "27") {
            assert.deepEqual(invoked.args, ["verify.mjs", "gradle", "project"]);
            assert.equal(invoked.gradle, s.gradle);
        } else {
            assert.equal(bindings.ORG_GRADLE_PROJECT_javaRelease, release);
            assert.deepEqual(invoked.args, ["verify.mjs", release, release === "21" ? "8.5" : "9.8.1",
                s.gradle, s.javaHome, diagnostics]);
        }
        const unchangedLines = text => text.trimEnd().split(/\r?\n/).filter(line =>
            !line.includes("java.import.gradle.home:") && !line.includes(`action: '${prefix}`));
        assert.deepEqual(unchangedLines(content), unchangedLines(s.original));
        assert.match(fs.readFileSync(path.join(s.staging, "gradle-version.log"), "utf8"),
            new RegExp(`Gradle ${release === "21" ? "8\\.5" : "9\\.8\\.1"}`));
    });
}

test("shared Java 27 binding rejects a wrong Gradle and preserves its version diagnostic before editing the plan", t => {
    const s = prepareBinding(t, "27", "9.7.1");
    assert.throws(s.run, error => {
        assert.match(error.stderr, /Expected Gradle 9\.8\.1/);
        return true;
    });
    assert.equal(fs.readFileSync(s.planFile, "utf8"), s.original);
    assert.match(fs.readFileSync(path.join(s.staging, "gradle-version.log"), "utf8"), /Gradle 9\.7\.1/);
    assert.equal(fs.readFileSync(s.envFile, "utf8"), "");
});
