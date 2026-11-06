// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const test = require("node:test");
const { checkCatalog, checkManifest, checkRuntime, checkExtraction, invariantTokens, manifestText } = require("../scripts/check-localization");

test("every manifest UI field resolves and all discovered locale catalogs are complete", () => {
    const { source } = checkManifest();
    assert.equal(Object.keys(source).length, 45);
});

test("runtime catalogs cover every shipped locale and exactly match extraction", () => {
    checkRuntime();
    checkExtraction();
});

test("placeholder guards allow reordering but reject missing, repeated or renamed parameters", () => {
    const source = { message: "{first}: {second}" };
    checkCatalog(source, { message: "{second}: {first}" }, "reordered");
    for (const message of ["{first}", "{first} {first}", "{first} {different}"]) {
        assert.throws(() => checkCatalog(source, { message }, "synthetic"));
    }
});

test("catalog guards reject missing, extra, empty, changed-link and changed-icon translations", () => {
    const source = { message: "$(info) __[Open](command:open?%22value%22)__" };
    for (const candidate of [
        {}, { ...source, extra: "extra" }, { message: " " },
        { message: "$(info) __[Open](command:different)__" },
        { message: "$(warning) __[Open](command:open?%22value%22)__" },
        { message: "$(info) [Open](command:open?%22value%22)" },
    ]) {
        assert.throws(() => checkCatalog(source, candidate, "synthetic"));
    }
    assert.throws(() => checkCatalog({ message: "Ready 👍" }, { message: "Ready 🔄" }, "synthetic"));
});

test("runtime guards discover added locales and reject missing catalogs and keys", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "java-pack-catalog-test-"));
    try {
        fs.mkdirSync(path.join(directory, "l10n"));
        fs.writeFileSync(path.join(directory, "package.nls.zz.json"), "{}");
        fs.writeFileSync(path.join(directory, "l10n", "bundle.l10n.json"), '{"Hello":"Hello"}');
        assert.throws(() => checkRuntime(directory), /shipped locales differ/);
        const translated = path.join(directory, "l10n", "bundle.l10n.zz.json");
        fs.writeFileSync(translated, "{}");
        assert.throws(() => checkRuntime(directory), /catalog keys differ/);
        fs.writeFileSync(translated, '{"Hello":"Test"}');
        checkRuntime(directory);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("extraction checking rejects drift without modifying committed resources", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "java-pack-extraction-test-"));
    try {
        fs.mkdirSync(path.join(directory, "src"));
        fs.mkdirSync(path.join(directory, "l10n"));
        fs.writeFileSync(path.join(directory, "src", "test.ts"), 'import * as l10n from "@vscode/l10n"; l10n.t("New message");');
        const catalog = path.join(directory, "l10n", "bundle.l10n.json");
        fs.writeFileSync(catalog, "{}");
        assert.throws(() => checkExtraction(directory), /extraction drift/);
        assert.equal(fs.readFileSync(catalog, "utf8"), "{}");
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("manifest translation preserves every action target and codicon", () => {
    const { source, manifest } = checkManifest();
    const chinese = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.nls.zh-cn.json"), "utf8"));
    const resolve = (text, catalog) => catalog[text.slice(1, -1)] ?? source[text.slice(1, -1)];
    for (const reference of manifestText(manifest)) {
        const english = resolve(reference, {});
        assert.equal(resolve(reference, {}), english, "Unsupported locale uses the English default");
        assert.deepEqual(invariantTokens(resolve(reference, chinese)), invariantTokens(english));
    }
    const missing = { ...chinese };
    delete missing["commands.overview.title"];
    assert.equal(resolve("%commands.overview.title%", missing), "Overview");
    assert.notEqual(resolve("%commands.overview.title%", chinese), "Overview");
});
