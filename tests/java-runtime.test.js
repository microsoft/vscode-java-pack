// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, mocks, warnings, globals = {}, resolve = require) {
    const filename = path.join(__dirname, "..", relativePath);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2016, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
        module, exports: module.exports, process, performance,
        require: name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : resolve(name),
        console: { warn: warning => warnings.push(warning) },
        ...globals,
    }, { filename });
    return module.exports;
}

function setupComponents() {
    const { renderToStaticMarkup } = require("react-dom/server");
    const cache = new Map();
    const messages = [];
    let receive;
    let html;
    const globals = {
        acquireVsCodeApi: () => ({ postMessage: message => messages.push(message) }),
        document: { getElementById: () => ({}) },
        window: { addEventListener: (_, listener) => { receive = listener; } },
    };
    const mocks = {
        "react-dom/client": { createRoot: () => ({ render: element => { html = renderToStaticMarkup(element); } }) },
    };
    function load(relativePath) {
        if (!cache.has(relativePath)) {
            cache.set(relativePath, loadSource(relativePath, mocks, [], globals, name => {
                if (name.endsWith(".scss") || name.startsWith("@vscode-elements/")) {
                    return {};
                }
                if (!name.startsWith(".")) {
                    return require(name);
                }
                const source = path.resolve(__dirname, "..", path.dirname(relativePath), name);
                const filename = fs.existsSync(source + ".tsx") ? source + ".tsx" : source + ".ts";
                return load(path.relative(path.join(__dirname, ".."), filename));
            }));
        }
        return cache.get(relativePath);
    }
    return {
        load, messages,
        show: args => {
            receive({ data: { command: "showJavaRuntimeEntries", args } });
            return html;
        },
    };
}

function setup(version = "1.57.0") {
    const extension = { packageJSON: { version }, isActive: false, exports: {} };
    const preferences = {};
    const discovered = [];
    const writes = [];
    const warnings = [];
    const messages = [];
    const calls = { discovery: 0, inspection: 0, activation: 0 };
    const runtimes = new Map();
    let receiveMessage;
    extension.activate = async () => { calls.activation++; return extension.exports; };
    const jdkUtils = {
        findRuntimes: async () => { calls.discovery++; return [...discovered]; },
        getRuntime: async home => { calls.inspection++; return runtimes.get(home); },
    };
    const panel = {
        webview: {
            cspSource: "test", asWebviewUri: uri => uri.fsPath,
            onDidReceiveMessage: callback => { receiveMessage = callback; return { dispose() {} }; },
            postMessage: async message => { messages.push(message); return true; },
        },
        onDidDispose: () => ({ dispose() {} }),
    };
    const vscode = {
        extensions: { getExtension: id => id === "redhat.java" ? extension : undefined },
        Uri: { file: fsPath => ({ fsPath }) }, ViewColumn: { One: 1 }, ConfigurationTarget: { Global: 1 },
        window: {
            createWebviewPanel: () => panel, showOpenDialog: async () => undefined,
            showWarningMessage: async message => warnings.push(message),
            showErrorMessage: async message => warnings.push(message),
        },
        workspace: {
            getConfiguration: section => ({
                get: key => preferences[section ? `${section}.${key}` : key],
                update: async (key, value) => {
                    const setting = section ? `${section}.${key}` : key;
                    writes.push({ setting, value });
                    preferences[setting] = value;
                },
            }),
        },
        commands: { executeCommand: async () => [] },
    };
    const mocks = { vscode, "jdk-utils": jdkUtils, "expand-home-dir": home => home };
    const api = loadSource(path.join("src", "java-runtime", "utils", "upstreamApi.ts"), mocks, warnings);
    const loadView = () => loadSource(path.join("src", "java-runtime", "index.ts"), {
        ...mocks, "../utils": { getNonce: () => "nonce" }, "../utils/jdt": {}, "../utils/webview": {},
        "./utils/misc": {}, "./utils/upstreamApi": api,
    }, warnings);
    const addJdk = (major, hasJavac = true) => {
        const homedir = path.join(path.parse(__dirname).root, "jdks", `jdk-${major}-${runtimes.size}`);
        const runtime = { homedir, hasJavac, version: { major } };
        runtimes.set(homedir, runtime);
        return runtime;
    };
    const report = (tooling, project = tooling) => {
        extension.isActive = true;
        extension.exports.javaRequirement = {
            tooling_jre: tooling.homedir, tooling_jre_version: tooling.version.major,
            java_home: project.homedir, java_version: project.version.major,
        };
    };
    const openView = async () => {
        const view = loadView();
        await view.javaRuntimeCmdHandler({
            extensionPath: __dirname, asAbsolutePath: relativePath => path.join(__dirname, relativePath),
            subscriptions: [],
        }, "unit-test");
        return view;
    };
    return {
        api, extension, preferences, discovered, writes, warnings, messages, calls, jdkUtils, vscode,
        addJdk, report, loadView, openView,
        send: (command, payload = {}) => receiveMessage({ command, ...payload }),
    };
}

for (const [version, minimum] of [
    ["1.38.0", 17], ["1.39.0", 21], ["1.56.0", 21],
    ["1.57.0", 25], ["1.57.2026093000", 25], ["1.58.0", 25],
]) {
    test(`redhat.java ${version} shares a JDK ${minimum} tooling minimum`, () => {
        const s = setup(version);
        assert.equal(s.api.getRequiredJdkVersion(), minimum);
        assert.equal(s.api.getToolingRuntimeInfo().requiredJdkVersion, minimum);
    });
}

test("an inactive extension provides no runtime result and is not probed or activated", () => {
    const s = setup();
    s.preferences["java.jdt.ls.java.home"] = "missing-jdk";
    s.discovered.push(s.addJdk(25), s.addJdk(27));
    Object.defineProperty(s.extension, "exports", { get() { throw new Error("Do not read an inactive extension's exports"); } });
    const info = s.api.getToolingRuntimeInfo();
    assert.equal(info.javaDotHome, undefined);
    assert.equal(info.javaHomeError, undefined);
    assert.equal(info.javaHomeWarning, undefined);
    assert.deepEqual(s.calls, { discovery: 0, inspection: 0, activation: 0 });
    assert.equal(s.writes.length, 0);
});

test("an active extension without requirements is unknown, not a startup failure", () => {
    const s = setup("1.38.0");
    s.extension.isActive = true;
    s.extension.exports.status = "Starting";
    const info = s.api.getToolingRuntimeInfo();
    assert.equal(info.javaDotHome, undefined);
    assert.equal(info.javaHomeError, undefined);
    assert.equal(s.calls.discovery, 0);
});

for (const version of [17, 21, 25, 27]) {
    test(`reported JDK ${version} is displayed without replacement or readiness claims`, () => {
        const s = setup();
        const actual = s.addJdk(version);
        s.report(actual);
        s.discovered.push(s.addJdk(27));
        const info = s.api.getToolingRuntimeInfo();
        assert.equal(info.javaDotHome, actual.homedir);
        assert.equal(info.toolingJreVersion, version);
        assert.equal(info.javaHomeError, undefined);
        if (version < 25) {
            assert.match(info.javaHomeWarning, /below the required Java 25/);
        }
        assert.deepEqual(s.calls, { discovery: 0, inspection: 0, activation: 0 });
        assert.equal(s.writes.length, 0);
    });
}

test("an unavailable extension is reported without inventing a JDK failure", () => {
    const s = setup();
    s.vscode.extensions.getExtension = () => undefined;
    const info = s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /installed and enabled/);
    assert.equal(info.javaHomeError, undefined);
});

test("a reported upstream error is displayed without inventing its cause or opening a popup", () => {
    const s = setup();
    s.extension.isActive = true;
    s.extension.exports.status = "Error";
    const info = s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeError, /redhat.java reports an error/);
    assert.equal(info.javaDotHome, undefined);
    s.report(s.addJdk(25));
    assert.match(s.api.getToolingRuntimeInfo().javaHomeError, /redhat.java reports an error/);
    assert.equal(s.warnings.length, 0);
});

test("a known under-minimum setting is explained using only upstream-reported versions", () => {
    const s = setup();
    const configured = s.addJdk(21);
    const actual = s.addJdk(25);
    s.preferences["java.jdt.ls.java.home"] = configured.homedir;
    s.report(actual, configured);
    const info = s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /uses Java 21, below the required Java 25/);
    assert.equal(info.javaDotHome, actual.homedir);
    assert.equal(info.javaHomeError, undefined);
    assert.equal(s.calls.inspection, 0);
    assert.equal(s.writes.length, 0);
});

test("an unexplained setting difference does not fabricate a version or fallback cause", () => {
    const s = setup();
    const actual = s.addJdk(27);
    s.report(actual);
    s.preferences["java.jdt.ls.java.home"] = "uninspected-setting";
    const info = s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /differs from the runtime reported/);
    assert.doesNotMatch(info.javaHomeWarning, /below|invalid|missing/);
    assert.equal(s.calls.inspection, 0);
});

test("equivalent configured paths do not produce an ignored-setting warning", () => {
    const s = setup();
    const actual = s.addJdk(25);
    s.report(actual);
    s.preferences["java.jdt.ls.java.home"] = actual.homedir + path.sep;
    assert.equal(s.api.getToolingRuntimeInfo().javaHomeWarning, undefined);
});

test("configuration differences do not hide an under-minimum reported runtime", () => {
    const s = setup();
    s.report(s.addJdk(21));
    s.preferences["java.jdt.ls.java.home"] = "different-setting";
    const info = s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /below the required Java 25/);
    assert.match(info.javaHomeWarning, /differs from the runtime reported/);
});

test("an older default project runtime is not diagnosed as an invalid tooling setting", () => {
    const s = setup();
    const project = s.addJdk(8);
    s.report(s.addJdk(25), project);
    s.preferences["java.home"] = project.homedir;
    s.preferences["java.configuration.runtimes"] = [{ path: project.homedir, default: true }];
    const before = JSON.stringify(s.preferences);
    assert.equal(s.api.getToolingRuntimeInfo().javaHomeWarning, undefined);
    assert.equal(JSON.stringify(s.preferences), before);
    assert.equal(s.writes.length, 0);
});

test("project discovery errors do not hide or invalidate the reported tooling runtime", async () => {
    const s = setup();
    const actual = s.addJdk(25);
    s.report(actual);
    s.jdkUtils.findRuntimes = async () => { throw new Error("Project discovery failed"); };
    const entries = await s.loadView().findJavaRuntimeEntries();
    assert.equal(entries.javaDotHome, actual.homedir);
    assert.equal(entries.toolingJreVersion, 25);
    assert.equal(entries.javaHomeError, undefined);
    assert.match(entries.projectJdkError, /Project discovery failed/);
});

test("a failed project inventory is visible without claiming an unknown runtime has failed", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw "Project discovery failed"; };
    const entries = await s.loadView().findJavaRuntimeEntries();
    assert.equal(entries.javaDotHome, undefined);
    assert.equal(entries.javaHomeError, undefined);
    assert.match(entries.projectJdkError, /Project discovery failed/);
});

test("project cache remains unchanged while refresh reads the latest upstream result", async () => {
    const s = setup();
    s.discovered.push(s.addJdk(8));
    const view = s.loadView();
    assert.equal((await view.findJavaRuntimeEntries()).javaDotHome, undefined);
    const actual = s.addJdk(27);
    s.report(actual);
    const entries = await view.findJavaRuntimeEntries();
    assert.equal(entries.javaDotHome, actual.homedir);
    assert.equal(entries.javaRuntimes[0].majorVersion, 8);
    assert.equal(s.calls.discovery, 1);
    assert.equal(s.calls.inspection, 0);
    assert.equal(s.calls.activation, 0);
});

for (const version of [25, 27]) {
    test(`only explicitly locating JDK ${version} saves the tooling setting`, async () => {
        const s = setup();
        const selected = s.addJdk(version);
        const actual = s.addJdk(27);
        s.report(actual);
        s.vscode.window.showOpenDialog = async () => [{ fsPath: selected.homedir }];
        await s.openView();
        assert.equal(s.writes.length, 0);
        await s.send("onWillBrowseForJDK");
        assert.deepEqual(s.writes, [{ setting: "java.jdt.ls.java.home", value: selected.homedir }]);
        assert.equal(s.messages.at(-1).args.javaDotHome, actual.homedir);
        assert.equal(s.calls.activation, 0);
    });
}

for (const [version, jdk] of [[24, true], [25, false]]) {
    test(`locating ${jdk ? "an under-minimum JDK" : "a JRE"} only warns, without saving it`, async () => {
        const s = setup();
        const invalid = s.addJdk(version, jdk);
        s.vscode.window.showOpenDialog = async () => [{ fsPath: invalid.homedir }];
        await s.openView();
        await s.send("onWillBrowseForJDK");
        assert.equal(s.writes.length, 0);
        assert.match(s.warnings.at(-1), jdk ? /Java 25 or more recent is required/ : /not a valid JDK/);
    });
}

test("a project scan failure is displayed only as a project inventory problem", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw new Error("Project discovery failed"); };
    await s.openView();
    await s.send("onWillListRuntimes");
    assert.match(s.messages.at(-1).args.projectJdkError, /Project discovery failed/);
    assert.equal(s.messages.at(-1).args.javaHomeError, undefined);
    assert.equal(s.writes.length, 0);
    assert.equal(s.calls.activation, 0);
});

for (const projectType of ["Maven", "Unmanaged folder"]) {
    test(`component rendering keeps ${projectType} controls when refresh reports an upstream error`, () => {
        const s = setup();
        s.report(s.addJdk(25));
        const components = setupComponents();
        components.load(path.join("src", "java-runtime", "assets", "index.ts"));
        const projectRuntimes = [{ name: "sample", rootPath: "file:///sample", projectType, sourceLevel: "17" }];
        const show = () => components.show({
            ...s.api.getToolingRuntimeInfo(), javaRuntimes: [], projectRuntimes,
        });
        assert.match(show(), /Configure Runtime for Projects/);
        s.extension.exports.status = "Error";
        const html = show();
        assert.match(html, /Configure Runtime for Projects/);
        assert.match(html, /redhat.java reports an error/);
        assert.match(html, /href="command:java.open.logs"/);
        assert.match(html, /sample/);
        assert.match(html, /title="Edit"/);
        assert.match(html, /Language server runtime reported by redhat.java/);
        assert.doesNotMatch(html, /Configure Runtime for Language Server/);
        assert.equal(components.messages.length, 1);
        assert.equal(components.messages[0].command, "onWillListRuntimes");
    });
}

test("component rendering preserves existing tooling error controls without project entries", () => {
    const s = setup();
    s.report(s.addJdk(25));
    s.extension.exports.status = "Error";
    const components = setupComponents();
    components.load(path.join("src", "java-runtime", "assets", "index.ts"));
    const html = components.show({
        ...s.api.getToolingRuntimeInfo(), javaRuntimes: [], projectRuntimes: [],
    });
    assert.match(html, /Configure Runtime for Language Server/);
    assert.match(html, /redhat.java reports an error/);
    assert.match(html, /Locate an <b>Existing JDK<\/b>/);
    assert.match(html, /Install a <b>New JDK<\/b>/);
});

test("component rendering leaves unknown metadata informational with manual setup available", () => {
    const components = setupComponents();
    components.load(path.join("src", "java-runtime", "assets", "index.ts"));
    const html = components.show({
        ...setup().api.getToolingRuntimeInfo(), javaRuntimes: [], projectRuntimes: [],
    });
    assert.match(html, /Configure Runtime for Projects/);
    assert.match(html, /runtime information is not available yet/);
    assert.match(html, /Locate an <b>Existing JDK<\/b>/);
    assert.match(html, /Install a <b>New JDK<\/b>/);
    assert.doesNotMatch(html, /redhat.java reports an error/);
});

test("FAQ component distinguishes project configuration from the language-server setting", () => {
    const { createElement } = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { default: FaqPanel } = setupComponents().load(path.join("src", "beginner-tips", "assets", "tabs", "FaqPanel.tsx"));
    const html = renderToStaticMarkup(createElement(FaqPanel, { requiredJdkVersion: 25 }));
    assert.match(html, /JDK 25\+/);
    assert.match(html, /href="command:java.runtime">Configure Java Runtime<\/a> page configures project JDKs/);
    assert.match(html, /href="command:java.open.logs"/);
    const settingLinks = [...html.matchAll(/href="command:java.webview.runCommand\?([^"]+)"/g)]
        .map(match => JSON.parse(decodeURIComponent(match[1])));
    assert.deepEqual(settingLinks.find(link => link.command === "workbench.action.openSettings").args, ["java.jdt.ls.java.home"]);
    assert.doesNotMatch(html, /guide shows the runtime reported/);
});

test("startup preserves welcome and release-note scheduling without runtime preflight or setup", async () => {
    const s = setup();
    const scheduled = [];
    const commands = [];
    const presented = [];
    let probes = 0;
    const Serializer = class {};
    const noop = () => {};
    s.preferences["java.help.firstView"] = "welcome";
    s.preferences["java.help.showReleaseNotes"] = true;
    s.vscode.languages = { registerCodeActionsProvider: noop };
    s.vscode.window.registerWebviewPanelSerializer = noop;
    s.vscode.commands.executeCommand = async command => { commands.push(command); };
    const extension = loadSource(path.join("src", "extension.ts"), {
        vscode: s.vscode,
        "vscode-extension-telemetry-wrapper": { instrumentOperation: (name, action) => context => action(name, context) },
        "./beginner-tips": { BeginnerTipsViewSerializer: Serializer },
        "./commands": { initialize: noop },
        "./daemon": { initDaemon: noop },
        "./exp": { initialize: noop },
        "./ext-guide": { JavaExtGuideViewSerializer: Serializer },
        "./formatter-settings": { initFormatterSettingsEditorProvider: noop },
        "./formatter-settings/RemoteProfileProvider": { initRemoteProfileProvider: noop },
        "./install-jdk": { InstallJdkViewSerializer: Serializer },
        "./java-runtime": {
            JavaRuntimeViewSerializer: Serializer,
            validateJavaRuntime: async () => { probes++; return false; },
        },
        "./misc": { HelpViewType: { None: "none" }, showReleaseNotesOnStart: () => presented.push("releaseNotes") },
        "./overview": { OverviewViewSerializer: Serializer },
        "./providers/CodeActionProvider": { CodeActionProvider: Serializer },
        "./recommendation": { initialize: noop },
        "./utils": { initialize: noop },
        "./utils/globalState": { KEY_SHOW_WHEN_USING_JAVA: "welcome" },
        "./utils/scheduler": { scheduleAction: async name => { scheduled.push(name); return name; } },
        "./welcome": { WelcomeViewSerializer: Serializer, showWelcomeWebview: () => presented.push("welcome") },
        "./project-settings/projectSettingsView": { ProjectSettingsViewSerializer: Serializer },
        "./utils/telemetryFilter": {},
    }, s.warnings);
    await extension.activate({
        subscriptions: [], globalState: { setKeysForSync: noop, get: () => true },
    });
    assert.equal(probes, 0);
    assert.deepEqual(commands, []);
    assert.deepEqual(scheduled, ["showFirstView", "showReleaseNotes"]);
    assert.deepEqual(presented, ["welcome", "releaseNotes"]);
    assert.equal(s.calls.activation, 0);
});
