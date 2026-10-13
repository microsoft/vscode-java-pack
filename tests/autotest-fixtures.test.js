// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "..");
const helper = path.join(root, ".github", "scripts", "prepare-autotest-fixtures.ps1");
const source = fs.readFileSync(helper, "utf8");
const hasPowerShell = spawnSync("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]).status === 0;
const quote = value => `'${value.replaceAll("'", "''")}'`;

function execute(plan, options = {}) {
    const script = `
        $global:calls = [System.Collections.Generic.List[object]]::new()
        $global:waits = [System.Collections.Generic.List[int]]::new()
        $global:failures = ${options.failures ?? 0}
        function git {
            $global:calls.Add(@($args | ForEach-Object { [string] $_ }))
            $global:LASTEXITCODE = 0
            if ($args -contains ${quote(options.failCommand ?? "fetch")} -and $global:failures -gt 0) {
                $global:failures--
                $global:LASTEXITCODE = 1
            }
        }
        function Start-Sleep { param([int] $Seconds) $global:waits.Add($Seconds) }
        function Test-Path { param([string] $LiteralPath) return $${options.existing ? "true" : "false"} }
        $failure = $null
        try {
            & {
                ${source.replaceAll("$PSScriptRoot", quote(path.dirname(helper)))}
            } -Plan ${quote(plan)}
        } catch { $failure = $_.Exception.Message }
        Write-Output ("__RESULT__" + (@{ calls = @($global:calls.ToArray()); waits = @($global:waits.ToArray()); failure = $failure } | ConvertTo-Json -Depth 5 -Compress))
    `;
    const result = spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const output = result.stdout.split(/\r?\n/).find(line => line.startsWith("__RESULT__"));
    assert.ok(output, result.stdout);
    return JSON.parse(output.slice("__RESULT__".length));
}

test("each plan downloads only its referenced upstream project, or skips upstream downloads", { skip: !hasPowerShell }, () => {
    for (const filename of fs.readdirSync(path.join(root, "test-plans")).filter(name => name.endsWith(".yaml"))) {
        const plan = filename.slice(0, -5);
        const content = fs.readFileSync(path.join(root, "test-plans", filename), "utf8");
        const fixture = content.match(/^\s+(?:workspace|file): "\.\.\/\.\.\/vscode-java\/(test\/resources\/projects\/(?:eclipse|maven)\/[^/"]+)/m)?.[1];
        const result = execute(plan);
        assert.equal(result.failure, null, plan);
        if (!fixture) {
            assert.deepEqual(result.calls, [], plan);
            continue;
        }
        const destination = path.resolve(root, "..", "vscode-java");
        assert.deepEqual(result.calls.find(args => args.includes("sparse-checkout")), [
            "-C", destination, "sparse-checkout", "set", "--no-cone", `/${fixture}/`,
        ], plan);
        assert.deepEqual(result.calls.find(args => args.includes("fetch")), [
            "-C", destination, "fetch", "--depth", "1", "--filter=blob:none", "origin", "HEAD",
        ], plan);
        assert.ok(result.calls.some(args => args.includes("remote.origin.promisor") && args.includes("true")), plan);
        assert.ok(result.calls.some(args => args.includes("remote.origin.partialclonefilter") && args.includes("blob:none")), plan);
        assert.equal(result.calls.filter(args => args.includes("checkout")).length, 1, plan);
    }
});

for (const failCommand of ["fetch", "checkout"]) {
    test(`a transient ${failCommand} failure retries and succeeds`, { skip: !hasPowerShell }, () => {
        const result = execute("java-maven", { failCommand, failures: 1 });
        assert.equal(result.failure, null);
        assert.equal(result.calls.filter(args => args.includes("fetch")).length, 2);
        assert.deepEqual(result.waits, [10]);
    });

    test(`persistent ${failCommand} failures stop after three attempts`, { skip: !hasPowerShell }, () => {
        const result = execute("java-maven", { failCommand, failures: 3 });
        assert.match(result.failure, /after 3 attempts \(exit 1\)/);
        assert.equal(result.calls.filter(args => args.includes("fetch")).length, 3);
        assert.deepEqual(result.waits, [10, 10]);
    });
}

test("existing sibling clones are never overwritten", { skip: !hasPowerShell }, () => {
    const result = execute("java-maven", { existing: true });
    assert.match(result.failure, /Refusing to overwrite existing fixture directory/);
    assert.deepEqual(result.calls, []);
});
