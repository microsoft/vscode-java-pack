// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const { createL10n } = require("./helpers/l10n");
const chinese = require("../l10n/bundle.l10n.zh-cn.json");

function loadSource(relativePath, mocks) {
    const filename = path.join(__dirname, "..", relativePath);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
        fileName: filename,
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
        module, exports: module.exports, console,
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    }, { filename });
    return module.exports;
}

function formatter(url, exists = true) {
    const calls = [];
    const dialogs = [];
    let choose;
    const vscode = {
        l10n: createL10n(chinese),
        languages: { createDiagnosticCollection: () => ({ set() {} }) },
        workspace: {
            getConfiguration: () => ({ get: key => key === "format.settings.url" ? url : undefined }),
            onDidChangeConfiguration() {}, onDidChangeTextDocument() {},
        },
        commands: { executeCommand: command => calls.push(command) },
        window: {
            showInformationMessage: async (message, ...actions) => {
                dialogs.push({ message, actions });
                return choose === undefined ? undefined : actions[choose];
            },
        },
    };
    vscode.window.showErrorMessage = vscode.window.showInformationMessage;
    const utils = {
        isRemote: value => value.startsWith("https:"),
        getProfilePath: async () => "profile.xml",
        addDefaultProfile: () => calls.push("default"),
        openFormatterSettings: () => calls.push("settings"),
        downloadFile: async () => "<profiles/>",
        parseProfile: () => ({ isValid: false }),
    };
    const { JavaFormatterSettingsEditorProvider } = loadSource(path.join("src", "formatter-settings", "index.ts"), {
        vscode, "fs-extra": { pathExists: async () => exists },
        "../utils": { getNonce: () => "test" },
        "../l10n/host": {},
        "./utils": utils,
        "./FormatterConstants": { JavaConstants: { SETTINGS_URL_KEY: "format.settings.url" }, VSCodeSettings: {}, SupportedSettings: {} },
        "./FormatterConverter": {},
        "./types": { ExampleKind: { INDENTATION_EXAMPLE: "Indentation" } },
        "./RemoteProfileProvider": { remoteProfileProvider: { setContent: () => calls.push("remote-content") } },
        "vscode-extension-telemetry-wrapper": {
            instrumentOperation: (name, action) => (...args) => action(name, ...args),
            sendInfo() {}, sendError() {}, setUserError() {},
        },
    });
    const provider = new JavaFormatterSettingsEditorProvider({});
    provider.downloadAndUse = async () => { calls.push("download"); return true; };
    return { provider, calls, dialogs, select: index => { choose = index; } };
}

test("translated formatter Yes routes to create while No and cancellation do nothing", async () => {
    for (const selection of [0, 1, undefined]) {
        const s = formatter(undefined);
        s.select(selection);
        await s.provider.checkProfileSettings();
        assert.equal(s.dialogs[0].actions[0].title, chinese.Yes);
        assert.equal(s.calls.includes("default"), selection === 0);
    }
});

test("translated formatter remote actions preserve read-only/download routing and cancellation", async () => {
    for (const selection of [0, 1, undefined]) {
        const s = formatter("https://example.test/profile.xml");
        s.select(selection);
        const checked = await s.provider.checkProfileSettings();
        assert.equal(checked, selection === 0);
        assert.equal(s.calls.includes("remote-content"), selection === 0);
        assert.equal(s.calls.includes("download"), selection === 1);
        assert.equal(s.provider.readOnly, selection === 0);
    }
});

test("translated missing-profile settings/default actions remain distinct", async () => {
    for (const selection of [0, 1, undefined]) {
        const s = formatter("profile.xml", false);
        s.select(selection);
        await s.provider.checkProfileSettings();
        assert.equal(s.calls.includes("settings"), selection === 0);
        assert.equal(s.calls.includes("default"), selection === 1);
    }
});

test("translated reload and invalid-profile actions preserve identity and cancellation", async () => {
    for (const selection of [0, 1, undefined]) {
        const s = formatter(undefined);
        s.provider.webviewPanel = { visible: true };
        s.select(selection);
        s.provider.onChangeProfileSettings();
        await Promise.resolve();
        assert.equal(s.calls.includes("workbench.action.webview.reloadWebviewAction"), selection === 0);
        await s.provider.parseProfileAndUpdate({});
        await Promise.resolve();
        assert.equal(s.calls.includes("settings"), selection === 0);
    }
});

test("translated recommendation Install action routes independently of its caption", async () => {
    const calls = [];
    let choose = true;
    const { recommendExtension } = loadSource(path.join("src", "utils", "index.ts"), {
        vscode: {
            l10n: createL10n(chinese),
            window: { showInformationMessage: async (_, action) => {
                assert.equal(action.title, chinese.Install);
                return choose ? action : undefined;
            } },
            commands: { executeCommand: (...args) => calls.push(args) },
        },
        "./idle": {}, "./scheduler": {}, "./release-notes": {}, "./extension": {},
        "vscode-extension-telemetry-wrapper": {},
    });
    await recommendExtension("example.extension", "message");
    choose = false;
    await recommendExtension("example.extension", "message");
    assert.deepEqual(calls, [["java.helper.installExtension", "example.extension", "example.extension"]]);
});

test("native message mock preserves upstream details and supports reordered placeholders", () => {
    const l10n = createL10n(chinese);
    assert.equal(l10n.t('"{0}" is not supported in id: "{1}".', "raw-value", "raw.id"), 'ID“raw.id”不支持“raw-value”。');
    assert.equal(l10n.t("Missing {0}", "detail"), "Missing detail");
});
