// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { fileURLToPath, pathToFileURL } = require("node:url");
const ts = require("typescript");

function loadSource(relativePath, mocks = {}) {
    const filename = path.join(__dirname, "..", relativePath);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
        module, exports: module.exports, process, console,
        require: name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name),
    }, { filename });
    return module.exports;
}

const jdk21 = { name: "JDK 21", path: path.join(__dirname, "jdk-21"), version: "21", typeName: "Standard VM" };
const jdk24 = { name: "JDK 24", path: path.join(__dirname, "jdk-24"), version: "24", typeName: "Standard VM" };
const projectUri = pathToFileURL(path.join(__dirname, "sample")).toString();

function setupHandler() {
    const messages = [];
    const errors = [];
    const notifications = [];
    const commands = [];
    let receive;
    let projectJdk = jdk21.path;
    let installs = [jdk21];
    const uri = value => ({ fsPath: fileURLToPath(value), toString: () => value });
    const vscode = {
        Uri: { parse: uri },
        workspace: { onDidChangeConfiguration: () => ({ dispose() {} }) },
        window: { showErrorMessage: async message => { notifications.push(message); } },
        commands: {
            executeCommand: async (_, command) => {
                commands.push(command);
                if (command === "java.vm.getAllInstalls") {
                    return installs;
                }
                return {
                    "org.eclipse.jdt.ls.core.natureIds": [],
                    "org.eclipse.jdt.ls.core.outputPath": path.join(__dirname, "sample", "bin"),
                    "org.eclipse.jdt.ls.core.vm.location": projectJdk,
                    "org.eclipse.jdt.ls.core.classpathEntries": [],
                };
            },
        },
    };
    const { ClasspathRequestHandler } = loadSource(path.join("src", "project-settings", "handlers", "ClasspathRequestHandler.ts"), {
        vscode,
        lodash: { ...require("lodash"), debounce: action => action },
        "../../utils/jdt": { getProjectType: () => "Unmanaged folder" },
        "../../utils/webview": { ProjectType: {}, isProjectType: () => true },
        "../types": { ClasspathEntryKind: {} },
        "vscode-extension-telemetry-wrapper": {
            instrumentOperation: (name, action) => (...args) => action(name, ...args),
            sendInfo() {}, setUserError() {}, sendError: error => errors.push(error),
        },
    });
    const handler = new ClasspathRequestHandler({
        onDidReceiveMessage: callback => { receive = callback; return { dispose() {} }; },
        postMessage: message => { messages.push(message); },
    });
    return {
        handler, vscode, messages, errors, notifications, commands,
        setJdk: jdk => { projectJdk = jdk.path; installs = [jdk21, jdk]; },
        send: (command, data = {}) => receive({ command, ...data }),
        refresh: () => handler.debounceLoadProjectClasspath(uri(projectUri)),
    };
}

test("classpath refresh loads newly registered JDKs with the current project path", async () => {
    const s = setupHandler();
    await s.send("classpath.onWillLoadProjectClasspath", { uri: projectUri });
    s.setJdk(jdk24);
    s.commands.length = 0;
    await s.refresh();
    const snapshot = s.messages.at(-1);
    assert.equal(snapshot.activeVmInstallPath, jdk24.path);
    assert.ok(snapshot.vmInstalls.some(install => install.path === jdk24.path));
    assert.deepEqual(s.commands, ["java.project.getSettings", "java.vm.getAllInstalls"]);
});

test("an older inventory response cannot overwrite a newer classpath snapshot", async () => {
    const s = setupHandler();
    const execute = s.vscode.commands.executeCommand;
    let resolveOld;
    let first = true;
    s.vscode.commands.executeCommand = (...args) => {
        if (args[1] === "java.vm.getAllInstalls" && first) {
            first = false;
            return new Promise(resolve => { resolveOld = resolve; });
        }
        return execute(...args);
    };
    const older = s.send("classpath.onWillListVmInstalls");
    s.setJdk(jdk24);
    await s.send("classpath.onWillLoadProjectClasspath", { uri: projectUri });
    resolveOld([jdk21]);
    await older;
    assert.equal(s.messages.length, 1);
    assert.equal(s.messages[0].activeVmInstallPath, jdk24.path);
    assert.ok(s.messages[0].vmInstalls.some(install => install.path === jdk24.path));
});

test("an empty inventory refresh clears previously listed JDKs", async () => {
    const s = setupHandler();
    s.vscode.commands.executeCommand = async () => [];
    await s.send("classpath.onWillListVmInstalls");
    assert.equal(s.messages.length, 1);
    assert.equal(s.messages[0].command, "classpath.onDidListVmInstalls");
    assert.equal(s.messages[0].vmInstalls.length, 0);
});

test("inventory errors are reported without discarding the actual project JDK", async () => {
    const s = setupHandler();
    const execute = s.vscode.commands.executeCommand;
    s.vscode.commands.executeCommand = (...args) => {
        if (args[1] === "java.vm.getAllInstalls") {
            throw new Error("VM inventory unavailable");
        }
        return execute(...args);
    };
    await s.send("classpath.onWillLoadProjectClasspath", { uri: projectUri });
    assert.equal(s.messages.at(-1).activeVmInstallPath, jdk21.path);
    assert.equal(s.messages.at(-1).vmInstalls, undefined);
    assert.equal(s.errors.length, 1);
    assert.match(s.notifications[0], /VM inventory unavailable/);
});

test("a late classpath response is ignored after switching projects", async () => {
    const s = setupHandler();
    const execute = s.vscode.commands.executeCommand;
    let resolveOld;
    let first = true;
    s.vscode.commands.executeCommand = (...args) => {
        if (args[1] === "java.project.getSettings" && first) {
            first = false;
            return new Promise(resolve => { resolveOld = () => execute(...args).then(resolve); });
        }
        return execute(...args);
    };
    const older = s.send("classpath.onWillLoadProjectClasspath", { uri: projectUri });
    const nextUri = pathToFileURL(path.join(__dirname, "other-sample")).toString();
    await s.send("classpath.onWillLoadProjectClasspath", { uri: nextUri });
    await resolveOld();
    await older;
    assert.equal(s.messages.length, 1);
});

function setupState() {
    const slice = loadSource(path.join("src", "project-settings", "assets", "classpath", "features", "classpathConfigurationViewSlice.ts"));
    let state = slice.default(undefined, slice.initializeClasspathData({ projectsNum: 1 }));
    return {
        slice,
        get state() { return state; },
        dispatch: action => { state = slice.default(state, action); },
    };
}

test("classpath snapshot updates the JDK list and selected path together", () => {
    const s = setupState();
    s.dispatch(s.slice.listVmInstalls([jdk21]));
    s.dispatch(s.slice.loadClasspath({
        activeProjectIndex: 0, activeVmInstallPath: jdk24.path, vmInstalls: [jdk21, jdk24],
        sources: [], output: "", libraries: [],
    }));
    assert.equal(s.state.data.activeVmInstallPath[0], jdk24.path);
    assert.ok(s.state.data.vmInstalls.some(install => install.path === jdk24.path));
});

test("inventory-only refresh preserves an unapplied JDK choice", () => {
    const s = setupState();
    s.dispatch(s.slice.loadClasspath({
        activeProjectIndex: 0, activeVmInstallPath: jdk21.path, vmInstalls: [jdk21],
        sources: [], output: "", libraries: [],
    }));
    s.dispatch(s.slice.setJdks({ activeProjectIndex: 0, activeVmInstallPath: jdk24.path }));
    s.dispatch(s.slice.listVmInstalls([jdk21, jdk24]));
    assert.equal(s.state.data.activeVmInstallPath[0], jdk24.path);
    assert.equal(s.state.data.effective.activeVmInstallPath[0], jdk21.path);
});

function renderJdk(installs, activePath) {
    const { createElement } = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const state = {
        commonConfig: { ui: { activeProjectIndex: 0 } },
        classpathConfig: { data: { vmInstalls: installs, activeVmInstallPath: [activePath] } },
    };
    const { default: JdkRuntime } = loadSource(path.join("src", "project-settings", "assets", "classpath", "features", "components", "JdkRuntime.tsx"), {
        "@vscode-elements/elements/dist/vscode-divider/index.js": {},
        "@vscode-elements/elements/dist/vscode-single-select/index.js": {},
        "@vscode-elements/elements/dist/vscode-option/index.js": {},
        "@vscode-elements/elements/dist/vscode-button/index.js": {},
        "react-redux": { useSelector: selector => selector(state), useDispatch: () => () => {} },
        "../../../vscode/utils": { ClasspathRequest: {}, CommonRequest: {} },
        "../classpathConfigurationViewSlice": {},
    });
    return renderToStaticMarkup(createElement(JdkRuntime));
}

test("an unlisted current JDK is shown explicitly instead of selecting JDK 21", () => {
    const html = renderJdk([jdk21], jdk24.path);
    assert.match(html, /Current project JDK \(not listed\)/);
    assert.match(html, /not in the available runtime list/);
    assert.match(html, /Refresh JDKs/);
    assert.doesNotMatch(html, /value="[^"]*jdk-21" selected/);
    assert.match(html, /value="[^"]*jdk-24" selected/);
});

test("missing project JDK metadata does not select the first installed JDK", () => {
    const html = renderJdk([jdk21], "");
    assert.match(html, /Project JDK not available/);
    assert.doesNotMatch(html, /value="[^"]*jdk-21" selected/);
});

test("a matching current JDK uses its real runtime label without an unavailable placeholder", () => {
    const html = renderJdk([jdk21, jdk24], jdk24.path);
    assert.match(html, /value="[^"]*jdk-24" selected/);
    assert.doesNotMatch(html, /Current project JDK \(not listed\)|Project JDK not available/);
});
