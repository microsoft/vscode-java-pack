// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, mocks, warnings) {
    const filename = path.join(__dirname, "..", relativePath);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2016,
            esModuleInterop: true,
        },
        fileName: filename,
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
        module,
        exports: module.exports,
        require: name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name),
        console: { warn: warning => warnings.push(warning) },
    }, { filename });
    return module.exports;
}

function createEvent() {
    const listeners = new Set();
    return {
        subscribe: listener => {
            listeners.add(listener);
            return { dispose: () => listeners.delete(listener) };
        },
        fire: value => listeners.forEach(listener => listener(value)),
        get size() { return listeners.size; },
    };
}

function setup(version = "1.57.0") {
    const extensionPath = path.join(path.parse(__dirname).root, "extensions", "redhat.java");
    const files = new Set();
    const runtimes = new Map();
    const preferences = {};
    const warnings = [];
    const discovered = [];
    const writes = [];
    const messages = [];
    const disposal = createEvent();
    const configuration = createEvent();
    const classpath = createEvent();
    let receiveMessage;
    const calls = { discovery: 0, inspection: 0, activation: 0 };
    const extension = { extensionPath, packageJSON: { version }, isActive: false, exports: {} };
    extension.activate = async () => {
        calls.activation++;
        extension.isActive = true;
        return extension.exports;
    };
    const javac = process.platform === "win32" ? "javac.exe" : "javac";
    const java = process.platform === "win32" ? "java.exe" : "java";
    const jdkUtils = {
        JAVAC_FILENAME: javac,
        JAVA_FILENAME: java,
        findRuntimes: async () => {
            calls.discovery++;
            return [...discovered];
        },
        getRuntime: async home => {
            calls.inspection++;
            return runtimes.get(home);
        },
    };
    const panel = {
        webview: {
            cspSource: "test",
            asWebviewUri: uri => uri.fsPath,
            onDidReceiveMessage: handler => {
                receiveMessage = handler;
                return { dispose() {} };
            },
            postMessage: async message => {
                messages.push(message);
                return true;
            },
        },
        onDidDispose: disposal.subscribe,
        reveal() {},
        dispose: () => disposal.fire(),
    };
    const vscode = {
        extensions: {
            getExtension: id => id === "redhat.java" ? extension : undefined,
        },
        Uri: { file: fsPath => ({ fsPath }) },
        ViewColumn: { One: 1 },
        ConfigurationTarget: { Global: 1 },
        window: {
            createWebviewPanel: () => panel,
            showOpenDialog: async () => undefined,
            showWarningMessage: async message => warnings.push(message),
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
            onDidChangeConfiguration: configuration.subscribe,
        },
        commands: { executeCommand: async () => [] },
    };
    const mocks = {
        vscode,
        "jdk-utils": jdkUtils,
        "fs-extra": {
            pathExists: async filename => files.has(filename),
            existsSync: filename => files.has(filename),
            statSync: () => ({ isDirectory: () => true }),
            readdirSync: () => ["jdk"],
        },
        "expand-home-dir": home => home,
    };
    const api = loadSource(path.join("src", "java-runtime", "utils", "upstreamApi.ts"), mocks, warnings);

    function addRuntime(major, { source = [], home, embedded = false, jdk = true, valid = true } = {}) {
        home = home || (embedded
            ? path.join(extensionPath, "jre", "jdk")
            : path.join(path.parse(__dirname).root, "jdks", `jdk-${major}-${runtimes.size}`));
        const runtime = { homedir: home, version: { major }, hasJavac: jdk, sources: source };
        runtimes.set(home, runtime);
        files.add(home);
        files.add(path.join(home, "bin", java));
        if (jdk) {
            files.add(path.join(home, "bin", javac));
        }
        if (valid) {
            files.add(path.join(home, "lib", "jrt-fs.jar"));
        }
        if (embedded) {
            files.add(path.join(extensionPath, "jre"));
        }
        return runtime;
    }

    function loadRuntimeView() {
        return loadSource(path.join("src", "java-runtime", "index.ts"), {
            ...mocks,
            "../utils": { getNonce: () => "nonce" },
            "../utils/jdt": {},
            "../utils/webview": {},
            "./utils/misc": {},
            "./utils/upstreamApi": api,
        }, warnings);
    }

    async function openView() {
        const view = loadRuntimeView();
        await view.javaRuntimeCmdHandler({
            extensionPath,
            asAbsolutePath: relativePath => path.join(extensionPath, relativePath),
            subscriptions: [],
        }, "unit-test");
        return view;
    }

    return {
        api, addRuntime, calls, classpath, configuration, discovered, extension, files,
        jdkUtils, loadRuntimeView, messages, openView, panel, preferences, vscode, warnings, writes,
        send: (command, payload = {}) => receiveMessage({ command, ...payload }),
    };
}

function assertUnresolved(info) {
    assert.equal(info.javaDotHome, undefined);
    assert.equal(info.toolingJreVersion, undefined);
}

function candidatePaths(info) {
    return Array.from(info.toolingRuntimes, runtime => runtime.fspath).sort();
}

for (const [version, minimum] of [
    ["1.38.0", 17],
    ["1.39.0", 21],
    ["1.56.0", 21],
    ["1.57.0", 25],
    ["1.57.2026093000", 25],
    ["1.58.0", 25],
]) {
    test(`redhat.java ${version} uses JDK ${minimum} as the tooling minimum`, async () => {
        const s = setup(version);
        assert.equal(s.api.getRequiredJdkVersion(), minimum);
        const jdk = s.addRuntime(minimum);
        s.discovered.push(jdk);
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.deepEqual(candidatePaths(info), [jdk.homedir]);
        assert.equal(info.javaHomeError, undefined);
    });
}

for (let version = 17; version < 25; version++) {
    test(`JDK ${version} alone does not satisfy redhat.java 1.57.0`, async () => {
        const s = setup();
        s.discovered.push(s.addRuntime(version));
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.equal(info.toolingRuntimes.length, 0);
        assert.match(info.javaHomeError, /Java 25 or more recent is required/);
        assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    });

    test(`an explicit JDK ${version} is explained without selecting bundled JDK 25 or changing settings`, async () => {
        const s = setup();
        const bundled = s.addRuntime(25, { embedded: true, jdk: false });
        const project = s.addRuntime(version);
        s.preferences["java.jdt.ls.java.home"] = project.homedir;
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.deepEqual(candidatePaths(info), [bundled.homedir]);
        assert.equal(info.javaHomeError, undefined);
        assert.match(info.javaHomeWarning, /below the required Java 25/);
        assert.equal(s.preferences["java.jdt.ls.java.home"], project.homedir);
        assert.equal(s.writes.length, 0);
        assert.equal(s.calls.activation, 0);
    });
}

for (const version of [25, 27]) {
    test(`external JDK ${version} is an available candidate, not a selected runtime`, async () => {
        const s = setup();
        const jdk = s.addRuntime(version);
        s.discovered.push(jdk);
        assert.equal(await s.loadRuntimeView().validateJavaRuntime(), true);
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.deepEqual(candidatePaths(info), [jdk.homedir]);
    });
}

test("bundled JDK 25 satisfies availability without a separate JDK 27 installation", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true, jdk: false });
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), true);
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [bundled.homedir]);
    assert.equal(info.toolingRuntimes[0].type, "Bundled runtime");
    assert.equal(s.writes.length, 0);
});

test("an under-minimum bundled runtime is excluded without selecting an external JDK", async () => {
    const s = setup();
    s.addRuntime(21, { embedded: true });
    const external = s.addRuntime(25, { source: ["JAVA_HOME"] });
    s.discovered.push(external);
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [external.homedir]);
});

test("an under-minimum explicit JDK does not trigger an independent fallback selection", async () => {
    const s = setup();
    const project = s.addRuntime(21);
    const tooling = s.addRuntime(25, { source: ["PATH"] });
    s.preferences["java.jdt.ls.java.home"] = project.homedir;
    s.discovered.push(project, tooling);
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [tooling.homedir]);
    assert.equal(s.preferences["java.jdt.ls.java.home"], project.homedir);
});

test("a qualified explicit tooling JDK and bundled runtime are both candidates until redhat.java reports a choice", async () => {
    const s = setup();
    const bundled = s.addRuntime(27, { embedded: true });
    const explicit = s.addRuntime(25);
    s.preferences["java.jdt.ls.java.home"] = explicit.homedir;
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [bundled.homedir, explicit.homedir].sort());
});

test("deprecated java.home remains unchanged and an older project JDK is not a tooling candidate", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.preferences["java.home"] = project.homedir;
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [bundled.homedir]);
    assert.equal(info.javaHomeWarning, undefined);
    assert.equal(s.preferences["java.home"], project.homedir);
    assert.equal(s.writes.length, 0);
});

test("a configured tooling JDK is inspected without applying it or deprecated java.home", async () => {
    const s = setup();
    const explicit = s.addRuntime(25);
    s.preferences["java.jdt.ls.java.home"] = explicit.homedir;
    s.preferences["java.home"] = s.addRuntime(27).homedir;
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [explicit.homedir]);
    assert.equal(s.writes.length, 0);
});

test("listing tooling candidates does not alter the older default project runtime", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.preferences["java.configuration.runtimes"] = [
        { path: s.addRuntime(21).homedir },
        { path: project.homedir, default: true },
        { path: s.addRuntime(27).homedir },
    ];
    const external = s.addRuntime(27, { source: ["JAVA_HOME"] });
    s.discovered.push(external);
    const before = JSON.stringify(s.preferences);
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [bundled.homedir, external.homedir].sort());
    assert.equal(JSON.stringify(s.preferences), before);
    assert.equal(s.writes.length, 0);
});

test("discovery lists every qualified candidate without ranking runtime sources", async () => {
    const s = setup();
    const environment = s.addRuntime(25, { source: ["JAVA_HOME"] });
    s.discovered.push(
        s.addRuntime(24, { source: ["JDK_HOME"] }),
        s.addRuntime(27, { source: ["SDKMAN"] }),
        s.addRuntime(28),
        environment,
    );
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.equal(info.toolingRuntimes.length, 3);
    assert.ok(candidatePaths(info).includes(environment.homedir));
});

test("JDK_HOME=25 and JAVA_HOME=27 do not cause Java Pack to choose either runtime", async () => {
    const s = setup();
    const jdkHome = s.addRuntime(25, { source: ["JDK_HOME"] });
    const javaHome = s.addRuntime(27, { source: ["JAVA_HOME"] });
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(21).homedir;
    for (const discovered of [[jdkHome, javaHome], [javaHome, jdkHome]]) {
        s.discovered.splice(0, s.discovered.length, ...discovered);
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.deepEqual(candidatePaths(info), [jdkHome.homedir, javaHome.homedir].sort());
    }
    assert.equal(s.writes.length, 0);
    assert.equal(s.calls.activation, 0);
});

test("duplicate detected and configured candidates are listed only once", async () => {
    const s = setup();
    const jdk = s.addRuntime(25);
    s.preferences["java.jdt.ls.java.home"] = jdk.homedir;
    s.discovered.push(jdk, jdk);
    assert.deepEqual(candidatePaths(await s.api.getToolingRuntimeInfo()), [jdk.homedir]);
});

test("discovery excludes installations missing the runtime libraries", async () => {
    const s = setup();
    const valid = s.addRuntime(25);
    s.discovered.push(s.addRuntime(27, { valid: false }), valid);
    assert.deepEqual(candidatePaths(await s.api.getToolingRuntimeInfo()), [valid.homedir]);
});

for (const preference of ["java.jdt.ls.java.home", "java.home"]) {
    test(`a missing ${preference} path is explained without changing settings or inventing a fallback`, async () => {
        const s = setup();
        s.preferences[preference] = path.join(path.parse(__dirname).root, "missing-jdk");
        s.discovered.push(s.addRuntime(25));
        const info = await s.api.getToolingRuntimeInfo();
        assertUnresolved(info);
        assert.ok(info.javaHomeWarning.includes(preference));
        assert.match(info.javaHomeWarning, /does not point to a valid JDK/);
        assert.equal(s.writes.length, 0);
    });
}

test("an explicitly configured JRE is not listed as an external tooling JDK", async () => {
    const s = setup();
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(25, { jdk: false }).homedir;
    const info = await s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /does not point to a valid JDK/);
    assert.equal(info.toolingRuntimes.length, 0);
});

test("an invalid configured bin directory is explained without modifying the setting", async () => {
    const s = setup();
    const jdk = s.addRuntime(25);
    const bin = path.join(jdk.homedir, "bin");
    s.files.add(bin);
    s.preferences["java.jdt.ls.java.home"] = bin;
    const info = await s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeWarning, /does not point to a valid JDK/);
    assert.equal(s.preferences["java.jdt.ls.java.home"], bin);
});

test("runtime discovery failures reject instead of leaving requirements unresolved", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw new Error("Discovery failed"); };
    await assert.rejects(s.api.getToolingRuntimeInfo(), /Discovery failed/);
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
});

test("the active language extension's actual runtime is authoritative", async () => {
    const s = setup();
    const actual = {
        tooling_jre: s.addRuntime(25).homedir,
        tooling_jre_version: 25,
        java_home: s.addRuntime(8).homedir,
        java_version: 8,
    };
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = actual;
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(27).homedir;
    const info = await s.api.getToolingRuntimeInfo();
    assert.equal(info.javaDotHome, actual.tooling_jre);
    assert.equal(info.toolingJreVersion, 25);
    assert.equal(info.toolingRuntimes.length, 0);
    assert.equal(s.calls.discovery, 0);
    assert.equal(s.writes.length, 0);
});

test("an active extension without the requirements API still reports an undetermined runtime", async () => {
    const s = setup("1.38.0");
    s.extension.isActive = true;
    const jdk = s.addRuntime(17);
    s.discovered.push(jdk);
    const info = await s.api.getToolingRuntimeInfo();
    assertUnresolved(info);
    assert.deepEqual(candidatePaths(info), [jdk.homedir]);
});

test("an under-minimum runtime exported by the language extension cannot report readiness", async () => {
    const s = setup();
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = {
        tooling_jre: s.addRuntime(24).homedir,
        tooling_jre_version: 24,
    };
    s.discovered.push(s.addRuntime(25));
    const info = await s.api.getToolingRuntimeInfo();
    assert.match(info.javaHomeError, /Java 25 or more recent is required/);
    assert.equal(info.javaDotHome, s.extension.exports.javaRequirement.tooling_jre);
    assert.equal(info.toolingJreVersion, 24);
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    assert.equal(s.calls.discovery, 0);
});

test("runtime entries separate bundled tooling candidates from older project JDK choices", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.discovered.push(project);
    s.preferences["java.configuration.runtimes"] = [{ path: project.homedir, default: true }];
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.requiredJdkVersion, 25);
    assertUnresolved(entries);
    assert.deepEqual(candidatePaths(entries), [bundled.homedir]);
    assert.equal(entries.javaHomeError, undefined);
    assert.equal(entries.javaRuntimes[0].majorVersion, 8);
});

test("runtime entries report a tooling error while retaining older project JDK choices", async () => {
    const s = setup();
    s.discovered.push(s.addRuntime(17), s.addRuntime(21));
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.requiredJdkVersion, 25);
    assert.match(entries.javaHomeError, /Java 25 or more recent is required/);
    assert.equal(entries.javaDotHome, undefined);
    assert.equal(entries.javaRuntimes.length, 2);
});

test("a missing language extension reports an error while preserving installation guidance", async () => {
    const s = setup();
    s.vscode.extensions.getExtension = () => undefined;
    s.discovered.push(s.addRuntime(25));
    assert.equal(s.api.getRequiredJdkVersion(), 25);
    assert.match((await s.api.getToolingRuntimeInfo()).javaHomeError, /'redhat.java' is not installed/);
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.requiredJdkVersion, 25);
    assert.match(entries.javaHomeError, /'redhat.java' is not installed/);
});

test("manual refresh transitions from candidates to the authoritative JDK 27 without activating or configuring Java", async () => {
    const s = setup();
    const jdkHome = s.addRuntime(25, { source: ["JDK_HOME"] });
    const javaHome = s.addRuntime(27, { source: ["JAVA_HOME"] });
    s.discovered.push(jdkHome, javaHome);
    await s.openView();
    await s.send("onWillListRuntimes");
    assertUnresolved(s.messages.at(-1).args);
    assert.deepEqual(candidatePaths(s.messages.at(-1).args), [jdkHome.homedir, javaHome.homedir].sort());
    assert.equal(s.configuration.size, 0);

    const messagesBeforeActivation = s.messages.length;
    s.extension.isActive = true;
    s.extension.exports = {
        javaRequirement: { tooling_jre: javaHome.homedir, tooling_jre_version: 27 },
        onDidClasspathUpdate: s.classpath.subscribe,
    };
    await new Promise(setImmediate);
    assert.equal(s.messages.length, messagesBeforeActivation);
    await s.send("onWillListRuntimes");
    assert.equal(s.messages.at(-1).args.javaDotHome, javaHome.homedir);
    assert.equal(s.messages.at(-1).args.toolingJreVersion, 27);
    assert.equal(s.messages.at(-1).args.toolingRuntimes.length, 0);
    assert.equal(s.classpath.size, 0);
    assert.equal(s.calls.activation, 0);
    assert.equal(s.writes.length, 0);
    s.panel.dispose();
    assert.equal(s.classpath.size, 0);
    assert.equal(s.configuration.size, 0);
});

test("a pending runtime view does not add activation or configuration listeners", async () => {
    const s = setup();
    await s.openView();
    assert.equal(s.classpath.size, 0);
    assert.equal(s.configuration.size, 0);
    s.panel.dispose();
    assert.equal(s.configuration.size, 0);
    assert.equal(s.calls.activation, 0);
});

test("refresh preserves the existing JDK cache but reads the current authoritative runtime", async () => {
    const s = setup();
    const jdk = s.addRuntime(25);
    s.discovered.push(jdk);
    const view = s.loadRuntimeView();
    assertUnresolved(await view.findJavaRuntimeEntries());
    const actual = s.addRuntime(27);
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = { tooling_jre: actual.homedir, tooling_jre_version: 27 };
    s.discovered.push(actual);
    const entries = await view.findJavaRuntimeEntries();
    assert.equal(entries.javaDotHome, actual.homedir);
    assert.equal(entries.toolingJreVersion, 27);
    assert.equal(entries.javaRuntimes.length, 1);
    assert.equal(s.calls.discovery, 1);
    assert.equal(entries.javaHomeError, undefined);
});

for (const version of [25, 27]) {
    test(`only explicitly locating JDK ${version} saves the tooling setting, not the actual runtime`, async () => {
        const s = setup();
        const selected = s.addRuntime(version);
        const actual = s.addRuntime(27);
        s.extension.isActive = true;
        s.extension.exports.javaRequirement = { tooling_jre: actual.homedir, tooling_jre_version: 27 };
        s.vscode.window.showOpenDialog = async () => [{ fsPath: selected.homedir }];
        await s.openView();
        assert.equal(s.writes.length, 0);
        await s.send("onWillBrowseForJDK");
        assert.deepEqual(s.writes, [{ setting: "java.jdt.ls.java.home", value: selected.homedir }]);
        assert.equal(s.messages.at(-1).args.javaDotHome, actual.homedir);
        assert.equal(s.calls.activation, 0);
        s.panel.dispose();
    });
}

for (const [version, jdk] of [[24, true], [25, false]]) {
    test(`locating ${jdk ? "an under-minimum JDK" : "a JRE"} does not save the tooling setting`, async () => {
        const s = setup();
        const invalid = s.addRuntime(version, { jdk });
        s.vscode.window.showOpenDialog = async () => [{ fsPath: invalid.homedir }];
        await s.openView();
        await s.send("onWillBrowseForJDK");
        assert.equal(s.writes.length, 0);
        assert.match(s.warnings.at(-1), jdk ? /Java 25 or more recent is required/ : /not a valid JDK/);
        s.panel.dispose();
    });
}

test("manual refresh updates configuration warnings without selecting or modifying a runtime", async () => {
    const s = setup();
    const jdk = s.addRuntime(25);
    s.discovered.push(jdk);
    await s.openView();
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(21).homedir;
    assert.equal(s.configuration.size, 0);
    await s.send("onWillListRuntimes");
    const entries = s.messages.at(-1).args;
    assertUnresolved(entries);
    assert.match(entries.javaHomeWarning, /below the required Java 25/);
    assert.deepEqual(candidatePaths(entries), [jdk.homedir]);
    assert.equal(s.writes.length, 0);
    s.panel.dispose();
});

test("candidate-discovery failures are surfaced in the runtime view", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw new Error("Discovery failed"); };
    await s.openView();
    await s.send("onWillListRuntimes");
    assert.match(s.messages.at(-1).args.javaHomeError, /Discovery failed/);
    assert.ok(s.warnings.some(warning => warning.message === "Discovery failed"));
    s.panel.dispose();
});

test("activation during candidate discovery cannot return a stale guessed runtime", async () => {
    const s = setup();
    const jdkHome = s.addRuntime(25, { source: ["JDK_HOME"] });
    const javaHome = s.addRuntime(27, { source: ["JAVA_HOME"] });
    let finishDiscovery;
    s.jdkUtils.findRuntimes = () => new Promise(resolve => { finishDiscovery = resolve; });
    const request = s.api.getToolingRuntimeInfo();
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = { tooling_jre: javaHome.homedir, tooling_jre_version: 27 };
    finishDiscovery([jdkHome, javaHome]);
    const info = await request;
    assert.equal(info.javaDotHome, javaHome.homedir);
    assert.equal(info.toolingJreVersion, 27);
    assert.equal(info.toolingRuntimes.length, 0);
});

test("failure to inspect a setting does not hide the authoritative runtime", async () => {
    const s = setup();
    const actual = s.addRuntime(27);
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = { tooling_jre: actual.homedir, tooling_jre_version: 27 };
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(25).homedir;
    s.jdkUtils.getRuntime = async () => { throw new Error("Inspection failed"); };
    const info = await s.api.getToolingRuntimeInfo();
    assert.equal(info.javaDotHome, actual.homedir);
    assert.equal(info.javaHomeError, undefined);
    assert.match(info.javaHomeWarning, /Inspection failed/);
    assert.equal(s.calls.discovery, 0);
});

test("failure to discover project JDK choices does not invent or hide the authoritative runtime", async () => {
    const s = setup();
    const actual = s.addRuntime(27);
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = { tooling_jre: actual.homedir, tooling_jre_version: 27 };
    s.jdkUtils.findRuntimes = async () => { throw new Error("Discovery failed"); };
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.javaDotHome, actual.homedir);
    assert.equal(entries.toolingJreVersion, 27);
    assert.match(entries.javaHomeError, /Discovery failed/);
});

test("classpath updates remain observable when the language extension has not reported a runtime", async () => {
    const s = setup("1.38.0");
    s.extension.isActive = true;
    s.extension.exports.onDidClasspathUpdate = s.classpath.subscribe;
    s.discovered.push(s.addRuntime(17));
    await s.openView();
    assert.equal(s.classpath.size, 1);
    s.classpath.fire();
    await new Promise(setImmediate);
    assertUnresolved(s.messages.at(-1).args);
    assert.equal(s.configuration.size, 0);
    s.panel.dispose();
    assert.equal(s.classpath.size, 0);
});

test("non-Error discovery failures are still visible rather than appearing as successful empty results", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw "Discovery failed"; };
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.javaHomeError, "Discovery failed");
});
