// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repository = path.join(__dirname, "..");
const workflow = fs.readFileSync(path.join(repository, ".github", "workflows", "e2e-autotest.yml"), "utf8")
    .replace(/\r\n/g, "\n");
const artifactConfig = fs.readFileSync(path.join(repository, ".github", "autotest-artifacts.yaml"), "utf8");
const quote = value => `'${value.replace(/'/g, "''")}'`;
const cliSetup = process.env.AUTOTEST_CLI_PATH
    ? `function autotest { & ${quote(process.execPath)} ${quote(path.resolve(process.env.AUTOTEST_CLI_PATH))} @args }`
    : "";

function stepScript(name, plan) {
    const start = workflow.indexOf(`      - name: ${name}\n`);
    assert.notEqual(start, -1, `Missing workflow step: ${name}`);
    const end = workflow.indexOf("\n      - name:", start + 1);
    const script = workflow.slice(start, end === -1 ? undefined : end).split("        run: |\n")[1];
    assert.ok(script, `Missing PowerShell script: ${name}`);
    return script.replaceAll("${{ matrix.plan }}", plan)
        .replaceAll("${{ github.event_name }}", "pull_request")
        .replaceAll("${{ inputs.pre_release }}", "false");
}

function withCase(plan, action) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-case-artifacts-"));
    const workspace = path.join(root, "workspace with spaces");
    const temporary = path.join(root, "runner temp");
    fs.mkdirSync(workspace);
    fs.mkdirSync(temporary);
    fs.mkdirSync(path.join(workspace, ".github"));
    const config = path.join(workspace, ".github", "autotest-artifacts.yaml");
    fs.writeFileSync(config, artifactConfig);
    fs.mkdirSync(path.join(workspace, "test-plans"));
    fs.writeFileSync(path.join(workspace, "test-plans", `${plan}.yaml`),
        `name: ${plan}\nsetup:\n  extension: redhat.java\nsteps:\n  - id: ready\n    action: wait 0 seconds\n`);
    const env = {
        ...process.env,
        GITHUB_WORKSPACE: workspace,
        GITHUB_ENV: path.join(root, "github-env"),
        RUNNER_TEMP: temporary,
        AUTOTEST_PLAN: plan,
        HOME: path.join(root, "home"),
    };
    for (const name of ["AUTOTEST_OUTPUT_DIR", "AUTOTEST_STAGING_DIR", "JAVA27_DIAGNOSTICS_DIR", "JAVA27_CI_GRADLE"]) {
        delete env[name];
    }
    const state = {
        workspace, temporary, env, config,
        output: path.join(workspace, "test-results", plan),
        staging: path.join(temporary, `autotest-${plan}`),
        runStep(name, setup = "") {
            return spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", `
                $ErrorActionPreference = "Stop"
                $PSNativeCommandUseErrorActionPreference = $true
                Set-Location -LiteralPath ${quote(workspace)}
                ${cliSetup}
                ${setup}
                ${stepScript(name, plan)}
            `], { encoding: "utf8", env });
        },
        readEnvironment() {
            for (const line of fs.readFileSync(env.GITHUB_ENV, "utf8").trim().split(/\r?\n/)) {
                const equals = line.indexOf("=");
                env[line.slice(0, equals)] = line.slice(equals + 1);
            }
        },
    };
    try {
        return action(state);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function assertSuccess(result) {
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
}

function readManifest(s) {
    return JSON.parse(fs.readFileSync(path.join(s.output, "artifacts", "manifest.json"), "utf8"));
}

function readArtifact(s, sourceId, sourcePath) {
    const source = readManifest(s).sources.find(entry => entry.id === sourceId);
    assert(source, `Missing source: ${sourceId}`);
    const file = source.files.find(entry => entry.sourcePath === sourcePath);
    assert(file, `Missing archived file: ${sourceId}/${sourcePath}`);
    return fs.readFileSync(path.join(s.output, file.path), "utf8");
}

for (const plan of [
    "java-test-navigation",
    "java-maven-java27",
    "java-gradle-java27",
    "java27-primitive-patterns",
    "java27-api",
    "java27-preview",
]) {
    test(`${plan} gets an isolated artifact directory and persistent Java 27 terminal path when needed`, () => {
        withCase(plan, s => {
            assertSuccess(s.runStep("Prepare case artifact directory"));
            s.readEnvironment();
            assert.equal(s.env.AUTOTEST_OUTPUT_DIR, s.output);
            assert.equal(s.env.AUTOTEST_STAGING_DIR, s.staging);
            assert(fs.statSync(path.join(s.output, "logs")).isDirectory());
            assert(fs.statSync(s.staging).isDirectory());
            if (plan.includes("java27")) {
                assert.equal(s.env.JAVA27_DIAGNOSTICS_DIR, path.join(s.staging, "terminal"));
                assert(!s.env.JAVA27_DIAGNOSTICS_DIR.startsWith(s.output));
            } else {
                assert.equal(s.env.JAVA27_DIAGNOSTICS_DIR, undefined);
            }
            assert(!s.staging.startsWith(s.output));
        });
    });
}

for (const [version, exitCode, valid] of [["9.8.1", 0, true], ["9.7.1", 0, false], ["9.8.1", 8, false]]) {
    test(`Gradle binding persists version ${version}, exit ${exitCode}, without dumping probe output`, () => {
        withCase("java-gradle-java27", s => {
            assertSuccess(s.runStep("Prepare case artifact directory"));
            s.readEnvironment();
            const executable = path.join(s.temporary, "Gradle with spaces.ps1");
            fs.writeFileSync(executable, `
                & ${quote(process.execPath)} -e ${quote(`console.log("Gradle ${version}"); console.error("probe details"); process.exit(${exitCode})`)}
                exit $LASTEXITCODE
            `);
            const result = s.runStep("Bind Gradle Java 27 toolchain", `
                function Get-Command {
                    [CmdletBinding()]
                    param([string] $Name, [object] $CommandType)
                    [pscustomobject]@{ Source = ${quote(executable)} }
                    [pscustomobject]@{ Source = "unselected-gradle" }
                }
            `);
            assert.ifError(result.error);
            assert.equal(result.status === 0, valid, result.stderr);
            const versionLog = fs.readFileSync(path.join(s.staging, "gradle-version.log"), "utf8");
            assert(versionLog.includes(executable));
            assert(versionLog.includes(`Gradle ${version}`));
            assert(versionLog.includes("probe details"));
            assert(!result.stdout.includes("probe details"));
            s.readEnvironment();
            assert.equal(s.env.JAVA27_CI_GRADLE, valid ? executable : undefined);
        });
    });
}

for (const [resultKind, exitCode] of [["valid", 0], ["valid", 7], ["absent", 138], ["malformed", 23]]) {
    test(`case logging survives output cleanup and preserves exit ${exitCode} with ${resultKind} results`, () => {
        withCase("java-test-navigation", s => {
            assertSuccess(s.runStep("Prepare case artifact directory"));
            s.readEnvironment();
            fs.writeFileSync(path.join(s.staging, "gradle-version.log"), "prepared before output cleanup");
            assertSuccess(s.runStep("Record case toolchain diagnostics"));
            const nativeScript = `
                const assert = require("node:assert/strict");
                const fs = require("node:fs");
                const path = require("node:path");
                const args = process.argv.slice(1);
                const output = args[args.indexOf("--output") + 1];
                assert.equal(args[args.indexOf("--log-output") + 1], path.join(output, "logs"));
                assert.equal(args[args.indexOf("--artifacts-config") + 1],
                    path.join(".github", "autotest-artifacts.yaml"));
                assert(args.includes("--logs"));
                assert.equal(args[args.indexOf("--analysis-mode") + 1], "case");
                assert(!args.includes("--no-llm"));
                assert(!args.includes("--pre-release"));
                fs.rmSync(output, { recursive: true, force: true });
                fs.mkdirSync(path.join(output, "logs"), { recursive: true });
                console.log("complete stdout evidence");
                console.error("complete stderr evidence");
                if (${quote(resultKind)} !== "absent") {
                    fs.writeFileSync(path.join(output, "results.json"), ${quote(resultKind)} === "valid"
                        ? JSON.stringify({ summary: { total: 9, passed: ${exitCode === 0 ? 9 : 8}, failed: ${exitCode === 0 ? 0 : 1}, errors: 0 } }) : "{invalid");
                }
                process.exit(${exitCode});
            `;
            const result = s.runStep("Run ${{ matrix.plan }}", `
                function autotest {
                    & ${quote(process.execPath)} -e ${quote(nativeScript)} -- @args
                }
            `);
            assert.ifError(result.error);
            assert.equal(result.status, exitCode, result.stderr);
            const consoleLog = fs.readFileSync(path.join(s.staging, "console.log"), "utf8");
            assert(consoleLog.includes("complete stdout evidence"));
            assert(consoleLog.includes("complete stderr evidence"));
            assert(!result.stdout.includes("complete stdout evidence"));
            const resultFile = path.join(s.output, "results.json");
            const resultBefore = fs.existsSync(resultFile) ? fs.readFileSync(resultFile) : null;
            const collected = s.runStep("Collect case logs and diagnostics");
            assertSuccess(collected);
            assert(collected.stdout.includes("Artifacts:"));
            assert.equal(readArtifact(s, "console", "console.log"), consoleLog);
            assert.equal(readArtifact(s, "ci-diagnostics", "gradle-version.log"),
                "prepared before output cleanup");
            assert.equal(JSON.parse(readArtifact(s, "ci-diagnostics", "ci-toolchain.json")).nodeVersionExitCode, 0);
            assert.equal(fs.existsSync(resultFile), resultBefore !== null);
            if (resultBefore) assert.deepEqual(fs.readFileSync(resultFile), resultBefore);
            assert.equal(readManifest(s).status, "complete");
        });
    });
}

test("every case preserves full IDE, lifecycle, hidden JDT and virtual-display logs with relative paths", () => {
    withCase("java-test-navigation", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
        fs.writeFileSync(s.config, artifactConfig.replace("platforms: [linux]", `platforms: [${process.platform}]`));
        const userData = path.join(s.workspace, ".vscode-test", "user-data");
        const ideLogs = [
            path.join("20261010", "main.log"),
            path.join("20261010", "window1", "exthost", "exthost.log"),
            path.join("20261010", "window1", "exthost", "helper", "Java 27 AutoTest.log"),
            path.join("20261010", "window1", "exthost", "maven", "Maven for Java.log"),
        ];
        for (const relative of ideLogs) {
            const source = path.join(userData, "logs", relative);
            fs.mkdirSync(path.dirname(source), { recursive: true });
            fs.writeFileSync(source, `full log: ${relative}`);
        }
        const jdtLog = path.join(userData, "User", "workspaceStorage", "workspace-id",
            "redhat.java", "jdt_ws", ".metadata", ".log");
        fs.mkdirSync(path.dirname(jdtLog), { recursive: true });
        const jdtContents = "full JDT evidence\n".repeat(20_000);
        fs.writeFileSync(jdtLog, jdtContents);
        fs.writeFileSync(path.join(s.temporary, "xvfb.log"), "display startup evidence");
        assertSuccess(s.runStep("Collect case logs and diagnostics"));
        for (const relative of ideLogs) {
            assert.equal(readArtifact(s, "ide", `logs/${relative.replaceAll("\\", "/")}`), `full log: ${relative}`);
        }
        assert.equal(readArtifact(s, "jdtls", "User/workspaceStorage/workspace-id/redhat.java/jdt_ws/.metadata/.log"), jdtContents);
        assert.equal(readArtifact(s, "display", "xvfb.log"), "display startup evidence");
        assert.equal(readManifest(s).status, "complete");
        assert(!fs.existsSync(path.join(s.output, "results.json")), "Crash recovery must not invent a result");
        const filesBefore = readManifest(s).sources.flatMap(source => source.files);
        assertSuccess(s.runStep("Collect case logs and diagnostics"));
        assert.deepEqual(readManifest(s).sources.flatMap(source => source.files), filesBefore);
    });
});

test("pre-launch setup failures retain available logs and explicitly report unavailable tools", () => {
    withCase("java-test-navigation", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
        fs.writeFileSync(s.config, artifactConfig.replace("platforms: [linux]", `platforms: [${process.platform}]`));
        fs.writeFileSync(path.join(s.temporary, "xvfb.log"), "display failed to start");
        const result = s.runStep("Record case toolchain diagnostics", `
            function Get-Command {
                [CmdletBinding()]
                param([string] $Name, [object] $CommandType)
            }
        `);
        assertSuccess(result);
        assert(result.stdout.includes("node unavailable"));
        assert(result.stdout.includes("java unavailable"));
        const collected = s.runStep("Collect case logs and diagnostics");
        assertSuccess(collected);
        assert.equal(readManifest(s).sources.find(source => source.id === "ide").status, "missing");
        assert.equal(readArtifact(s, "display", "xvfb.log"), "display failed to start");
        const identity = JSON.parse(readArtifact(s, "ci-diagnostics", "ci-toolchain.json"));
        assert.equal(identity.node, null);
        assert.equal(identity.java, null);
        assert(!fs.existsSync(path.join(s.output, "results.json")));
    });
});

test("Java 27 terminal logs and exit metadata survive output initialization and use the shared collector", () => {
    withCase("java-maven-java27", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
        fs.mkdirSync(s.env.JAVA27_DIAGNOSTICS_DIR);
        const metadata = JSON.stringify({ command: "mvn", args: ["clean", "compile"], status: 7, signal: null });
        fs.writeFileSync(path.join(s.env.JAVA27_DIAGNOSTICS_DIR, "maven-project-build.log"), "complete compiler diagnostics");
        fs.writeFileSync(path.join(s.env.JAVA27_DIAGNOSTICS_DIR, "maven-project-build.log.json"), metadata);
        fs.rmSync(s.output, { recursive: true, force: true });
        assertSuccess(s.runStep("Collect case logs and diagnostics"));
        assert.equal(readArtifact(s, "ci-diagnostics", "terminal/maven-project-build.log"), "complete compiler diagnostics");
        assert.deepEqual(JSON.parse(readArtifact(s, "ci-diagnostics", "terminal/maven-project-build.log.json")), JSON.parse(metadata));
        assert(!fs.existsSync(path.join(s.output, "results.json")));
    });
});

for (const started of [false, true]) {
    test(`native report collection filters process names and requires persisted run start (${started})`, () => {
        withCase("java-webview-migration", s => {
            assertSuccess(s.runStep("Prepare case artifact directory"));
            s.readEnvironment();
            fs.writeFileSync(s.config, artifactConfig.replace("platforms: [darwin]", `platforms: [${process.platform}]`));
            const source = path.join(s.env.HOME, "Library", "Logs", "DiagnosticReports");
            fs.mkdirSync(source, { recursive: true });
            for (const name of ["node_recent.ips", "Code Helper (Renderer)_recent.crash", "java_recent.ips",
                "node_old.ips", "Safari_recent.ips"]) {
                fs.writeFileSync(path.join(source, name), "{}");
            }
            const old = new Date(Date.now() - 60_000);
            fs.utimesSync(path.join(source, "node_old.ips"), old, old);
            if (started) {
                fs.mkdirSync(path.join(s.output, "artifacts"));
                fs.writeFileSync(path.join(s.output, "artifacts", "manifest.json"), JSON.stringify({
                    schemaVersion: 1, generatedAt: new Date().toISOString(),
                    runStartedAt: new Date(Date.now() - 5_000).toISOString(), status: "complete", sources: [],
                }));
            }
            assertSuccess(s.runStep("Collect case logs and diagnostics"));
            const native = readManifest(s).sources.find(entry => entry.id === "native-reports");
            assert.deepEqual(native.files.map(file => file.sourcePath).sort(), started
                ? ["Code Helper (Renderer)_recent.crash", "java_recent.ips", "node_recent.ips"].sort() : []);
            if (!started) assert.match(native.reason, /Run start is unavailable/);
        });
    });
}

test("optional sources do not conceal collection errors or overwrite a successful run verdict", () => {
    withCase("java-test-navigation", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
        const reportFile = path.join(s.output, "results.json");
        const report = JSON.stringify({ summary: { total: 1, passed: 1, failed: 0, errors: 0 } });
        fs.writeFileSync(reportFile, report);
        const logs = path.join(s.workspace, ".vscode-test", "user-data", "logs");
        fs.mkdirSync(logs, { recursive: true });
        fs.writeFileSync(path.join(logs, "invalid.log"), Buffer.from([0xff, 0xfe]));
        const result = s.runStep("Collect case logs and diagnostics");
        assert.ifError(result.error);
        assert.notEqual(result.status, 0);
        assert.equal(readManifest(s).status, "failed");
        assert.match(readManifest(s).sources.find(source => source.id === "ide").errors.join("\n"), /encoded data/);
        assert.equal(fs.readFileSync(reportFile, "utf8"), report);
    });
});

test("per-case collection and upload remain unconditional and preserve artifact and analysis contracts", () => {
    assert.match(workflow, /name: Install resolved AutoTest CLI\n        if: always\(\)/);
    assert(workflow.indexOf("name: Install resolved AutoTest CLI", workflow.indexOf("  e2e-test:"))
        < workflow.indexOf("name: Setup Java 27"));
    assert.match(workflow, /name: Record case toolchain diagnostics\n        if: always\(\)/);
    assert.match(workflow, /name: Collect case logs and diagnostics\n        if: always\(\)/);
    const collect = stepScript("Collect case logs and diagnostics", "java27-api").trim();
    assert(collect.startsWith('& autotest collect --output $env:AUTOTEST_OUTPUT_DIR --artifacts-config'));
    assert(collect.includes('--plan "test-plans/java27-api.yaml"'));
    assert.equal(collect.split("\n").length, 2, "CI must delegate collection rather than reimplement it");
    assert(!workflow.includes("Collect macOS AutoTest crash reports"));
    assert(!workflow.includes("AUTOTEST_RUN_STARTED"));
    assert(artifactConfig.includes("platforms: [linux]"));
    assert(artifactConfig.includes("platforms: [darwin]"));
    assert(artifactConfig.includes("modifiedSince: run-start"));
    assert.match(workflow, /name: Upload results\n        if: always\(\)/);
    assert(workflow.includes("name: results-${{ matrix.plan }}-${{ matrix.os }}"));
    assert(workflow.includes("path: test-results/${{ matrix.plan }}/"));
    assert(workflow.includes('if [ -f "$dir/results.json" ]; then'));
    assert(workflow.includes('cp -r "$dir" "test-results/$suffix"'));
    assert(workflow.includes("autotest analyze test-results --output test-results --analysis-mode case --report-only"));
    assert(!workflow.includes("Print Gradle Java 27 terminal diagnostics"));
});
