// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "e2e-autotest.yml"), "utf8")
    .replace(/\r\n/g, "\n");
const quote = value => `'${value.replace(/'/g, "''")}'`;

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
    const env = {
        ...process.env,
        GITHUB_WORKSPACE: workspace,
        GITHUB_ENV: path.join(root, "github-env"),
        RUNNER_TEMP: temporary,
        AUTOTEST_PLAN: plan,
    };
    for (const name of ["AUTOTEST_OUTPUT_DIR", "AUTOTEST_STAGING_DIR", "JAVA27_DIAGNOSTICS_DIR", "JAVA27_CI_GRADLE"]) {
        delete env[name];
    }
    const state = {
        workspace, temporary, env,
        output: path.join(workspace, "test-results", plan),
        staging: path.join(temporary, `autotest-${plan}`),
        runStep(name, setup = "") {
            return spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", `
                $ErrorActionPreference = "Stop"
                $PSNativeCommandUseErrorActionPreference = $true
                Set-Location -LiteralPath ${quote(workspace)}
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
                assert.equal(s.env.JAVA27_DIAGNOSTICS_DIR, path.join(s.output, "diagnostics", "terminal"));
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
            const nativeScript = `
                const assert = require("node:assert/strict");
                const fs = require("node:fs");
                const path = require("node:path");
                const args = process.argv.slice(1);
                const output = args[args.indexOf("--output") + 1];
                assert.equal(args[args.indexOf("--log-output") + 1], path.join(output, "logs"));
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
            const collected = s.runStep("Collect case logs and diagnostics");
            assert.ifError(collected.error);
            if (resultKind === "malformed") {
                assert.notEqual(collected.status, 0, "Corrupt results must surface explicitly");
            } else {
                assertSuccess(collected);
                if (resultKind === "valid") {
                    assert(collected.stdout.includes(`AutoTest: ${exitCode === 0 ? 9 : 8}/9 passed`));
                }
            }
            assert.equal(fs.readFileSync(path.join(s.output, "logs", "console.log"), "utf8"), consoleLog);
            assert.equal(fs.readFileSync(path.join(s.output, "diagnostics", "gradle-version.log"), "utf8"),
                "prepared before output cleanup");
            assert(fs.existsSync(path.join(s.output, "diagnostics", "ci-toolchain.json")));
        });
    });
}

test("every case preserves full IDE, lifecycle, hidden JDT and virtual-display logs with relative paths", () => {
    withCase("java-test-navigation", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
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
            assert.equal(fs.readFileSync(path.join(s.output, "logs", "ide", relative), "utf8"), `full log: ${relative}`);
        }
        assert.equal(fs.readFileSync(path.join(s.output, "logs", "jdtls", "workspace-id.log"), "utf8"), jdtContents);
        assert.equal(fs.readFileSync(path.join(s.output, "logs", "xvfb.log"), "utf8"), "display startup evidence");
    });
});

test("pre-launch setup failures retain available logs and explicitly report unavailable tools", () => {
    withCase("java-test-navigation", s => {
        assertSuccess(s.runStep("Prepare case artifact directory"));
        s.readEnvironment();
        fs.writeFileSync(path.join(s.temporary, "xvfb.log"), "display failed to start");
        const result = s.runStep("Collect case logs and diagnostics", `
            function Get-Command {
                [CmdletBinding()]
                param([string] $Name, [object] $CommandType)
            }
        `);
        assertSuccess(result);
        assert(result.stdout.includes("node unavailable"));
        assert(result.stdout.includes("java unavailable"));
        assert(result.stdout.includes("VS Code logs unavailable"));
        assert.equal(fs.readFileSync(path.join(s.output, "logs", "xvfb.log"), "utf8"), "display failed to start");
        const identity = JSON.parse(fs.readFileSync(path.join(s.output, "diagnostics", "ci-toolchain.json")));
        assert.equal(identity.node, null);
        assert.equal(identity.java, null);
        assert(!fs.existsSync(path.join(s.output, "results.json")));
    });
});

test("per-case collection and upload remain unconditional and preserve artifact and analysis contracts", () => {
    assert.match(workflow, /name: Collect case logs and diagnostics\n        if: always\(\)/);
    assert.match(workflow, /name: Collect macOS AutoTest crash reports\n        if: \$\{\{ always\(\) && runner\.os == 'macOS' \}\}/);
    assert.match(workflow, /name: Upload results\n        if: always\(\)/);
    assert(workflow.includes("name: results-${{ matrix.plan }}-${{ matrix.os }}"));
    assert(workflow.includes("path: test-results/${{ matrix.plan }}/"));
    assert(workflow.includes('if [ -f "$dir/results.json" ]; then'));
    assert(workflow.includes('cp -r "$dir" "test-results/$suffix"'));
    assert(workflow.includes("autotest analyze test-results --output test-results --analysis-mode case --report-only"));
    assert(!workflow.includes("Print Gradle Java 27 terminal diagnostics"));
});
