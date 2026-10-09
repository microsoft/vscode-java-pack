// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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
                    readFileSync: location => location.endsWith("pom.xml")
                        ? "<maven.compiler.enablePreview>true</maven.compiler.enablePreview>"
                        : bytecode,
                    existsSync: () => classWritten,
                    console: { log: message => messages.push(message) },
                    process: {
                        argv: ["node", filename, options.builder ?? "gradle", "project"],
                        platform, arch: platform === "darwin" ? "arm64" : "x64",
                        execPath: paths.join(root, "terminal-node"), version: "v24.20.0",
                        env: {
                            CI: options.ci ? "true" : undefined,
                            GITHUB_ACTIONS: options.githubActions ? "true" : undefined,
                            PATH: paths.join(root, "terminal-tools"),
                            JAVA_HOME: paths.join(root, "jdk-21"),
                            JAVA27_HOME: javaHome,
                            JAVA27_DIAGNOSTICS_DIR: options.diagnostics === false ? undefined : diagnosticDirectory,
                            JAVA27_CI_GRADLE: Object.hasOwn(options, "ciGradle") ? options.ciGradle : ciGradle,
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
                        if (args.includes("--version") || /(?:^|\s)--version"?$/.test(invocation)) {
                            return { status: 0, stdout: `Gradle ${control ? "9.8.1" : "9.7.1"}\n`, stderr: "" };
                        }
                        const spawnError = control ? options.controlSpawnError : options.spawnError;
                        if (spawnError) {
                            return { status: null, error: spawnError, stdout: "", stderr: "Cannot start Gradle\n" };
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
    test(`${platform} CI builds use the absolute Gradle without changing Node or JDK`, () => {
        const s = execute(platform, { ci: true, buildStatus: 1 });
        s.run();
        const builds = s.calls.filter(call => call.args.join(" ").includes("clean classes"));
        assert.equal(builds.length, 1);
        const [build] = builds;
        if (platform === "win32") {
            assert.equal(build.args[3], `""${s.ciGradle}" --no-daemon --console=plain clean classes --stacktrace --info"`);
            assert.equal(build.options.windowsVerbatimArguments, true);
        } else {
            assert.equal(build.command, s.ciGradle);
        }
        assert.equal(build.options.env.JAVA_HOME, s.javaHome);
        const identity = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "terminal-toolchain.json")));
        assert.equal(identity.nodeVersion, "v24.20.0");
        assert.equal(identity.gradleCommand, s.ciGradle);
        assert.equal(identity.projectJavaHome, s.javaHome);
        assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-path-version.log")), /Gradle 9\.7\.1/);
        assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-ci-version.log")), /Gradle 9\.8\.1/);
        assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
        assert.ok(s.messages.includes("JDK27_PROJECT_PASSED"));
    });

    test(`${platform} a failed bound CI build cannot fall back to PATH or retry a control`, () => {
        const s = execute(platform, { ci: true, controlStatus: 1 });
        assert.throws(s.run, /Original Gradle compilation error/);
        const builds = s.calls.filter(call => call.args.join(" ").includes("clean classes"));
        assert.equal(builds.length, 1);
        const metadata = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-project-build.log.json")));
        assert.equal(metadata.status, 1);
        assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
        assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "failure.log")), /Original Gradle compilation error/);
        assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
    });

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

test("GitHub Actions binds Gradle independently of opt-in diagnostics", () => {
    const s = execute("darwin", { githubActions: true, diagnostics: false, buildStatus: 1 });
    s.run();
    assert.equal(s.calls.length, 3);
    assert.equal(s.calls[1].command, s.ciGradle);
    assert.deepEqual(Array.from(s.calls[1].args), ["--no-daemon", "--console=plain", "clean", "classes"]);
    assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "terminal-toolchain.json")));
    assert.ok(s.messages.includes("JDK27_PROJECT_PASSED"));
});

for (const [name, options] of [
    ["missing CI binding", { ci: true, ciGradle: undefined }],
    ["missing GitHub Actions binding", { githubActions: true, ciGradle: undefined }],
    ["empty CI binding", { ci: true, ciGradle: "" }],
    ["relative CI binding", { ci: true, ciGradle: "gradle" }],
]) {
    test(`${name} fails explicitly even when diagnostics are disabled`, () => {
        const s = execute("darwin", { diagnostics: false, ...options });
        assert.throws(s.run, /CI Gradle builds require an absolute JAVA27_CI_GRADLE/);
        assert.equal(s.calls.length, 0);
        assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
    });
}

for (const [name, options, message] of [
    ["wrong CI bytecode", { bytecodeMajor: 70 }, /Expected Java 27 bytecode/],
    ["failed CI application", { applicationStatus: 1 }, /JDK27_PROJECT:27/],
]) {
    test(`${name} still fails after a successful bound build`, () => {
        const s = execute("darwin", { ci: true, ...options });
        assert.throws(s.run, message);
        assert.ok(s.messages.every(output => !output.includes("JDK27_PROJECT_PASSED")));
    });
}

test("CI Maven builds do not require a Gradle binding", () => {
    const s = execute("darwin", { ci: true, builder: "maven", ciGradle: undefined, diagnostics: false });
    s.run();
    assert.equal(s.calls[1].command, "mvn");
    assert.ok(s.messages.includes("JDK27_PROJECT_PASSED"));
});

test("an unavailable bound CI executable retains its error without falling back", () => {
    const s = execute("darwin", {
        ci: true,
        controlSpawnError: Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    });
    assert.throws(s.run, /ENOENT/);
    const builds = s.calls.filter(call => call.args.join(" ").includes("clean classes"));
    assert.equal(builds.length, 1);
    assert.equal(builds[0].command, s.ciGradle);
    const metadata = JSON.parse(s.files.get(s.paths.join(s.diagnosticDirectory, "gradle-project-build.log.json")));
    assert.equal(metadata.error.code, "ENOENT");
    assert.ok(!s.files.has(s.paths.join(s.diagnosticDirectory, "gradle-ci-control.json")));
    assert.match(s.files.get(s.paths.join(s.diagnosticDirectory, "failure.log")), /ENOENT/);
    assert.ok(s.messages.every(message => !message.includes("JDK27_PROJECT_PASSED")));
});

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

test("PowerShell CI resolution selects one executable when Get-Command returns multiple applications", () => {
    const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "e2e-autotest.yml"), "utf8");
    const expression = workflow.match(/^\s*\$ciGradle = (.+)$/m)?.[1];
    assert.ok(expression, "The workflow must resolve the CI control executable");
    const script = `
        function Get-Command {
            [CmdletBinding()]
            param([string] $Name, [object] $CommandType)
            [pscustomobject]@{ Source = "/ci/gradle-9.8.1/bin/gradle" }
            [pscustomobject]@{ Source = "/other/gradle" }
        }
        $resolved = ${expression}
        if ($resolved -isnot [string] -or $resolved -ne "/ci/gradle-9.8.1/bin/gradle") {
            throw "Expected one executable, got: $resolved"
        }
        Write-Output $resolved
    `;
    const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "/ci/gradle-9.8.1/bin/gradle");
});

test("PowerShell release lookup authenticates metadata without forwarding credentials to asset downloads", () => {
    const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "e2e-autotest.yml"), "utf8");
    const headers = workflow.match(/^\s*\$githubHeaders = @\{[\s\S]*?^\s*\}/m)?.[0];
    const request = workflow.match(/^\s*\$release = Invoke-RestMethod .+$/m)?.[0];
    const assetDownload = workflow.match(/^\s*Invoke-WebRequest -Uri \$url -OutFile .+$/m)?.[0];
    assert.ok(headers, "The workflow must define GitHub metadata headers");
    assert.ok(request, "The workflow must resolve the requested release");
    assert.ok(assetDownload, "The workflow must download the selected asset");
    assert.doesNotMatch(assetDownload, /-Headers/);
    const script = `
        $ErrorActionPreference = "Stop"
        $env:GITHUB_TOKEN = "autotest-test-token"
        ${headers}
        function Invoke-RestMethod {
            [CmdletBinding()]
            param([string] $Uri, [hashtable] $Headers, [switch] $UseBasicParsing)
            if ($Uri -ne "https://api.github.com/repos/redhat-developer/vscode-java/releases/tags/v1.57.0") {
                throw "Unexpected release URL"
            }
            if ($Headers.Authorization -cne "Bearer autotest-test-token") {
                throw "Release metadata lookup must use the workflow token"
            }
            if ($Headers.Accept -ne "application/vnd.github+json") {
                throw "Expected GitHub API metadata"
            }
            [pscustomobject]@{ tag_name = "v1.57.0" }
        }
        $apiUrl = "https://api.github.com/repos/redhat-developer/vscode-java/releases/tags/v1.57.0"
        ${request}
        if ($release.tag_name -ne "v1.57.0") { throw "Unexpected release" }
        Write-Output "authenticated-release-metadata"
    `;
    const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "authenticated-release-metadata");
});

test("affected plans keep file logs inside the existing CI artifact directory", () => {
    const root = path.join(__dirname, "..");
    for (const name of ["java-gradle-java27", "java27-primitive-patterns", "java-webview-migration"]) {
        const filename = path.join(root, "test-plans", `${name}.yaml`);
        const plan = fs.readFileSync(filename, "utf8");
        const directory = plan.match(/^logging:\r?\n  enabled: true\r?\n  outputDir: "([^"]+)"/m)?.[1];
        assert.ok(directory, `${name} must enable AutoTest file logs`);
        assert.equal(path.resolve(path.dirname(filename), directory), path.join(root, "test-results", "run-logs"));
    }
});

test("PowerShell crash collection preserves only relevant reports from the current run", () => {
    const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "e2e-autotest.yml"), "utf8");
    const step = workflow.match(/      - name: Collect macOS AutoTest crash reports\r?\n[\s\S]*?        run: \|\r?\n([\s\S]*?)(?=\r?\n      - name:)/)?.[1];
    assert.ok(step, "The workflow must collect macOS native crash evidence");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "java27-crash-logs-"));
    try {
        const home = path.join(root, "home");
        const source = path.join(home, "Library", "Logs", "DiagnosticReports");
        fs.mkdirSync(source, { recursive: true });
        for (const name of ["node_recent.ips", "Code Helper (Renderer)_recent.crash", "java_recent.ips", "node_old.ips", "Safari_recent.ips"]) {
            fs.writeFileSync(path.join(source, name), "{}");
        }
        const old = new Date(Date.now() - 60_000);
        fs.utimesSync(path.join(source, "node_old.ips"), old, old);
        const quote = value => `'${value.replace(/'/g, "''")}'`;
        const script = `
            $ErrorActionPreference = "Stop"
            $env:HOME = ${quote(home)}
            $env:AUTOTEST_RUN_STARTED = "${new Date(Date.now() - 5_000).toISOString()}"
            Set-Location -LiteralPath ${quote(root)}
            ${step}
        `;
        const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(fs.readdirSync(path.join(root, "test-results", "run-logs", "macos-crashes")).sort(),
            ["Code Helper (Renderer)_recent.crash", "java_recent.ips", "node_recent.ips"].sort());
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
