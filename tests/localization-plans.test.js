// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const plansDirectory = path.join(root, "test-plans");
const pages = [
    "java.installJdk.fromWalkthrough", "java.welcome", "java.gettingStarted",
    "java.extGuide", "java.overview", "java.runtime", "java.projectSettings", "java.formatterSettings",
];

function steps(source) {
    return source.split(/^  - id: /m).slice(1);
}

for (const locale of ["en", "zh-cn"]) {
    const filename = `localization-${locale}.yaml`;
    const source = fs.readFileSync(path.join(plansDirectory, filename), "utf8").replace(/\r\n/g, "\n");
    const scenarioSteps = steps(source);

    test(`${locale} localization is discoverable and selects an isolated locale environment`, () => {
        assert.ok(fs.readdirSync(plansDirectory).includes(filename));
        assert.match(source, new RegExp(`^  locale: "${locale}"$`, "m"));
        assert.match(source, /^  vscodeConfig: "config\/localization\.json"$/m);
        assert.match(source, /^  workspace: "\.\.\/test-fixtures\/super-implementation"$/m);
        assert.ok(fs.statSync(path.join(plansDirectory, "../test-fixtures/super-implementation")).isDirectory());
        if (locale === "zh-cn") {
            assert.match(source, /"MS-CEINTL\.vscode-language-pack-zh-hans"/);
        }
        assert.doesNotMatch(source, /verifyNotification:/);
        const commands = scenarioSteps.map(step => step.match(/action: "executeVSCodeCommand (.+)"/)?.[1]).filter(Boolean);
        commands.push("workbench.action.openWalkthrough vscjava.vscode-java-pack#javaWelcome");
        // Evidence capture allocates one additional command binding.
        assert.equal(new Set(commands).size, 11);
    });

    test(`${locale} localization guards every current page against missing and wrong-language text`, () => {
        for (const command of pages) {
            const action = command === "java.projectSettings"
                ? `action: "run command Java: ${locale === "en" ? "Open Project Settings" : "打开项目设置"}"`
                : `action: "executeVSCodeCommand ${command}"`;
            const step = scenarioSteps.find(value => value.includes(action));
            assert.ok(step, `Missing page command ${command}`);
            assert.match(step, /verifyEditorTab:\n\s+title:/, command);
            assert.match(step, /\n\s+active: true/, command);
            assert.match(step, /verifyWebview:\n\s+contains:/, command);
            assert.match(step, /\n\s+notContains:/, command);
        }
    });

    test(`${locale} localization verifies action effects and real reload restoration`, () => {
        assert.match(source, /executeVSCodeCommand java\.toggleAwtDevelopment true/);
        assert.match(source, /executeVSCodeCommand java\.toggleAwtDevelopment false/);
        assert.match(source, /matches: .*java\\\.completion\\\.filteredTypes/);
        assert.match(source, /contains: '"java\.awt\.\*"'/);
        for (const [id, value] of [
            ["disable-formatter-detect-indentation", "false"], ["restore-formatter-detect-indentation", "true"],
        ]) {
            const step = scenarioSteps.find(value => value.startsWith(`"${id}"`));
            assert.ok(step);
            assert.match(step, /clickInWebview input\[id="editor\.detectIndentation"\]/);
            assert.match(step, /verifyFile:\n\s+path: "~\/\.vscode\/settings\.json"/);
            assert.match(step, new RegExp(`matches: .*editor\\\\\\.detectIndentation.*${value}`));
        }
        const reloadIndex = scenarioSteps.findIndex(step => step.includes("executeVSCodeCommand workbench.action.reloadWindow"));
        assert.ok(reloadIndex > 0);
        assert.match(scenarioSteps[reloadIndex - 1], /click side tab (Explorer|资源管理器)/);
        const restored = scenarioSteps[reloadIndex + 1];
        assert.match(restored, /action: "wait 3 seconds"/);
        assert.match(restored, /verifyEditorTab:\n\s+title: .+\n\s+active: true/);
        assert.match(restored, /verifyWebview:\n\s+contains:/);
        assert.match(restored, /\n\s+notContains:/);
        assert.doesNotMatch(restored, /executeVSCodeCommand/);
    });
}

test("shared localization setup fixes raw settings and bypasses the suppressed formatter prompt", () => {
    const config = JSON.parse(fs.readFileSync(path.join(plansDirectory, "config", "localization.json"), "utf8"));
    assert.equal(config.schemaVersion, 1);
    assert.equal(config.vscodeVersion, "stable");
    assert.equal(config.settings["java.help.firstView"], "none");
    assert.equal(config.settings["java.help.showReleaseNotes"], false);
    assert.equal(config.workspaceSettings["java.format.settings.url"], ".vscode/java-formatter.xml");
    assert.equal(config.workspaceSettings["[java]"]["editor.detectIndentation"], true);
});

test("CI resolves latest once for all jobs, discovers locale plans and propagates failures", () => {
    const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "e2e-autotest.yml"), "utf8").replace(/\r\n/g, "\n");
    const resolutions = [...workflow.matchAll(/npm view @vscjava\/vscode-autotest@(\S+) version/g)];
    assert.deepEqual(resolutions.map(match => match[1]), ["latest"]);
    const discovery = workflow.split("\n  discover:")[1].split("\n  e2e-test:")[0];
    assert.match(discovery, /version=\$\(npm view @vscjava\/vscode-autotest@latest version\)/);
    assert.match(discovery, /if \[\[ ! "\$version" =~ .+ \]\]; then\n\s+echo "::error::Invalid AutoTest version returned by npm: \$version"\n\s+exit 1/);
    assert.ok(discovery.includes('echo "version=$version" >> "$GITHUB_OUTPUT"'));
    assert.ok(discovery.includes("autotest_version: ${{ steps.autotest.outputs.version }}"));
    for (const job of ["e2e-test", "analyze"]) {
        const consumer = workflow.split(`\n  ${job}:`)[1].split(/\n  [a-z-]+:/)[0];
        assert.match(consumer, /needs: \[discover, /);
        assert.ok(consumer.includes('npm install -g "@vscjava/vscode-autotest@${{ needs.discover.outputs.autotest_version }}"'));
        assert.doesNotMatch(consumer, /npm view|vscode-autotest@latest/);
    }
    assert.match(workflow, /ls test-plans\/\*\.yaml/);
    assert.match(workflow, /plan: \$\{\{ fromJson\(needs\.discover\.outputs\.matrix\) \}\}/);
    const run = workflow.split("      - name: Run ${{ matrix.plan }}")[1].split("      - name: Collect case logs")[0];
    assert.match(run, /& autotest @autotestArgs \*> \$consoleLog/);
    assert.match(run, /\$testExit = \$LASTEXITCODE/);
    assert.match(run, /exit \$testExit/);
    assert.doesNotMatch(workflow, /continue-on-error:/);
    assert.doesNotMatch(run, /localization.*(skip|exit 0)/i);
});

test("macOS locale CI uses a short job-owned temp root without losing isolation", () => {
    const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "e2e-autotest.yml"), "utf8").replace(/\r\n/g, "\n");
    const run = workflow.split("      - name: Run ${{ matrix.plan }}")[1].split("      - name: Collect case logs")[0];
    const condition = 'if ($env:RUNNER_OS -eq "macOS" -and "${{ matrix.plan }}" -in @("localization-en", "localization-zh-cn"))';
    const start = run.indexOf(condition);
    const end = run.indexOf('Write-Host "Running:', start);
    assert.ok(start >= 0 && end > start);
    const setup = run.slice(start, end);
    assert.match(setup, /Test-Path -LiteralPath \$env:RUNNER_TEMP -PathType Container/);
    assert.match(setup, /throw "The localization run requires an existing RUNNER_TEMP directory\."/);
    assert.match(setup, /\$env:TMPDIR = \$env:RUNNER_TEMP/);
    assert.ok(end < run.indexOf("& autotest @autotestArgs"));

    // VS Code uses the profile plus a truncated version/type for its main socket.
    const socket = temp => path.posix.join(temp, "autotest-environment-XXXXXX", "user-data", "1.14-main.sock");
    const defaultTemp = `/private/var/folders/aa/${"a".repeat(30)}/T`;
    assert.ok(Buffer.byteLength(socket(defaultTemp)) > 103);
    assert.ok(Buffer.byteLength(socket("/Users/runner/work/_temp")) < 103);
});
