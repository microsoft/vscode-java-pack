// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const readJson = filename => JSON.parse(fs.readFileSync(filename, "utf8"));

function invariantTokens(message) {
    return [
        ...message.matchAll(/\$\([^)]+\)|\]\(([^)]+)\)|\u{1f4a1}|\u2728|\u{1f504}|\u{1f44d}|\u2666\ufe0f?|\u26a1/gu),
    ].map(match => match[1] || match[0]).sort();
}

function placeholderTokens(message) {
    return [...message.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
}

function checkCatalog(source, translated, name) {
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(source).sort(), `${name}: catalog keys differ`);
    for (const [key, value] of Object.entries(source)) {
        const translation = translated[key];
        assert.equal(typeof translation, "string", `${name}: ${key} is not text`);
        assert.ok(translation.trim(), `${name}: ${key} is empty`);
        assert.deepEqual(invariantTokens(translation), invariantTokens(value), `${name}: ${key} changes a link or icon`);
        assert.deepEqual(placeholderTokens(translation), placeholderTokens(value), `${name}: ${key} changes placeholders`);
        for (const marker of ["__", "**", "`"]) {
            assert.equal(translation.split(marker).length, value.split(marker).length, `${name}: ${key} changes Markdown ${marker}`);
        }
    }
}

function checkRuntime(directory = root) {
    const source = readJson(path.join(directory, "l10n", "bundle.l10n.json"));
    checkCatalog(source, source, "English runtime");
    const locales = fs.readdirSync(path.join(directory, "l10n")).filter(name => /^bundle\.l10n\.[^.]+\.json$/.test(name));
    const manifestLocales = fs.readdirSync(directory).filter(name => /^package\.nls\.[^.]+\.json$/.test(name))
        .map(name => name.slice("package.nls.".length, -".json".length)).sort();
    assert.deepEqual(locales.map(name => name.slice("bundle.l10n.".length, -".json".length)).sort(),
        manifestLocales, "Manifest and runtime shipped locales differ");
    for (const name of locales) {
        checkCatalog(source, readJson(path.join(directory, "l10n", name)), name);
    }
}

function manifestText(manifest) {
    const contributions = manifest.contributes;
    return [
        manifest.displayName, manifest.description, contributions.configuration.title,
        ...contributions.commands.map(command => command.title),
        ...contributions.javaShortcuts.map(shortcut => shortcut.title),
        ...contributions.customEditors.map(editor => editor.displayName),
        ...contributions.walkthroughs.flatMap(walkthrough => [
            walkthrough.title, walkthrough.description,
            ...walkthrough.steps.flatMap(step => [step.title, step.description, ...(step.media.altText ? [step.media.altText] : [])]),
        ]),
        ...Object.values(contributions.configuration.properties).flatMap(property => [
            property.description, ...property.enumDescriptions || [],
        ]),
    ];
}

function checkManifest(directory = root) {
    const source = readJson(path.join(directory, "package.nls.json"));
    const manifest = readJson(path.join(directory, "package.json"));
    const used = new Set();
    for (const value of manifestText(manifest)) {
        assert.match(value, /^%[^%]+%$/, `Manifest UI text is not externalized: ${value}`);
        const key = value.slice(1, -1);
        assert.ok(Object.hasOwn(source, key), `Missing manifest key: ${key}`);
        used.add(key);
    }
    assert.deepEqual([...used].sort(), Object.keys(source).sort(), "Unused or missing manifest resources");
    checkCatalog(source, source, "English");
    const locales = fs.readdirSync(directory).filter(name => /^package\.nls\.[^.]+\.json$/.test(name));
    assert.ok(locales.length, "No translated manifest catalogs");
    for (const name of locales) {
        checkCatalog(source, readJson(path.join(directory, name)), name);
    }
    return { manifest, source, locales };
}

function checkExtraction(directory = root) {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "java-pack-l10n-"));
    try {
        const cli = path.join(path.dirname(require.resolve("@vscode/l10n-dev/package.json")), "dist", "cli.js");
        const result = spawnSync(process.execPath, [cli, "export", "-o", temporary, path.join(directory, "src")], { encoding: "utf8" });
        if (result.error) {
            throw result.error;
        }
        assert.equal(result.status, 0, `Localization extraction failed:\n${result.stdout}\n${result.stderr}`);
        const extracted = path.join(temporary, "bundle.l10n.json");
        const actual = fs.existsSync(extracted) ? readJson(extracted) : {};
        assert.deepEqual(readJson(path.join(directory, "l10n", "bundle.l10n.json")), actual,
            "Localization extraction drift: run npm run l10n:export and update every translation.");
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
}

if (require.main === module) {
    checkManifest();
    checkRuntime();
    if (process.argv.includes("--check-extraction")) {
        checkExtraction();
    }
    console.log("Localization catalogs are valid.");
}

module.exports = { checkCatalog, checkManifest, checkRuntime, checkExtraction, invariantTokens, manifestText, placeholderTokens };
