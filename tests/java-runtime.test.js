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

function setup(version = "1.57.0") {
    const extensionPath = path.join(path.parse(__dirname).root, "extensions", "redhat.java");
    const files = new Set();
    const runtimes = new Map();
    const preferences = {};
    const warnings = [];
    const discovered = [];
    const calls = { discovery: 0, inspection: 0 };
    const extension = { extensionPath, packageJSON: { version }, isActive: false, exports: {} };
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
        getSources: runtime => runtime.sources,
    };
    const vscode = {
        extensions: {
            getExtension: id => id === "redhat.java" ? extension : undefined,
        },
        env: { appName: "Visual Studio Code" },
        workspace: { getConfiguration: () => ({ get: key => preferences[key] }) },
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
            "../utils": {},
            "../utils/jdt": {},
            "../utils/webview": {},
            "./utils/misc": {},
            "./utils/upstreamApi": api,
        }, warnings);
    }

    return { api, addRuntime, calls, discovered, extension, files, jdkUtils, loadRuntimeView, preferences, vscode, warnings };
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
        const result = await s.api.resolveRequirements();
        assert.equal(result.tooling_jre, jdk.homedir);
        assert.equal(result.tooling_jre_version, minimum);
    });
}

for (let version = 17; version < 25; version++) {
    test(`JDK ${version} alone does not satisfy redhat.java 1.57.0`, async () => {
        const s = setup();
        s.discovered.push(s.addRuntime(version));
        await assert.rejects(s.api.resolveRequirements(), /Java 25 or more recent is required/);
        assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    });

    test(`an explicit JDK ${version} falls back to bundled JDK 25 and remains the project JDK`, async () => {
        const s = setup();
        const bundled = s.addRuntime(25, { embedded: true, jdk: false });
        const project = s.addRuntime(version);
        s.preferences["java.jdt.ls.java.home"] = project.homedir;
        const result = await s.api.resolveRequirements();
        assert.equal(result.tooling_jre, bundled.homedir);
        assert.equal(result.tooling_jre_version, 25);
        assert.equal(result.java_home, project.homedir);
        assert.equal(result.java_version, version);
        assert.equal(s.calls.discovery, 0);
        assert.match(s.warnings[0], /will not be used to launch/);
    });
}

for (const version of [25, 27]) {
    test(`external JDK ${version} satisfies the tooling requirement`, async () => {
        const s = setup();
        const jdk = s.addRuntime(version);
        s.discovered.push(jdk);
        assert.equal(await s.loadRuntimeView().validateJavaRuntime(), true);
        assert.equal((await s.api.resolveRequirements()).tooling_jre_version, version);
    });
}

test("bundled JDK 25 satisfies readiness without discovering an external JDK", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true, jdk: false });
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), true);
    const result = await s.api.resolveRequirements();
    assert.equal(result.tooling_jre, bundled.homedir);
    assert.equal(result.java_home, bundled.homedir);
    assert.equal(result.java_version, 25);
    assert.equal(s.calls.discovery, 0);
});

test("an under-minimum bundled runtime falls back to a qualified external JDK", async () => {
    const s = setup();
    s.addRuntime(21, { embedded: true });
    const external = s.addRuntime(25, { source: ["JAVA_HOME"] });
    s.discovered.push(external);
    assert.equal((await s.api.resolveRequirements()).tooling_jre, external.homedir);
});

test("an under-minimum explicit JDK falls back to discovery without replacing the project JDK", async () => {
    const s = setup();
    const project = s.addRuntime(21);
    const tooling = s.addRuntime(25, { source: ["PATH"] });
    s.preferences["java.jdt.ls.java.home"] = project.homedir;
    s.discovered.push(project, tooling);
    const result = await s.api.resolveRequirements();
    assert.equal(result.tooling_jre, tooling.homedir);
    assert.equal(result.java_home, project.homedir);
    assert.equal(result.java_version, 21);
});

test("a qualified explicit tooling JDK overrides the bundled runtime", async () => {
    const s = setup();
    s.addRuntime(27, { embedded: true });
    const explicit = s.addRuntime(25);
    s.preferences["java.jdt.ls.java.home"] = explicit.homedir;
    assert.equal((await s.api.resolveRequirements()).tooling_jre, explicit.homedir);
});

test("deprecated java.home can select an older project JDK without replacing the bundled tooling runtime", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.preferences["java.home"] = project.homedir;
    const result = await s.api.resolveRequirements();
    assert.equal(result.tooling_jre, bundled.homedir);
    assert.equal(result.java_home, project.homedir);
    assert.equal(result.java_version, 8);
});

test("java.jdt.ls.java.home takes precedence over deprecated java.home", async () => {
    const s = setup();
    const explicit = s.addRuntime(25);
    s.preferences["java.jdt.ls.java.home"] = explicit.homedir;
    s.preferences["java.home"] = s.addRuntime(27).homedir;
    assert.equal((await s.api.resolveRequirements()).tooling_jre, explicit.homedir);
});

test("bundled tooling respects the older default project runtime in java.configuration.runtimes", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.preferences["java.configuration.runtimes"] = [
        { path: s.addRuntime(21).homedir },
        { path: project.homedir, default: true },
        { path: s.addRuntime(27).homedir },
    ];
    s.discovered.push(s.addRuntime(27, { source: ["JAVA_HOME"] }));
    const result = await s.api.resolveRequirements();
    assert.equal(result.tooling_jre, bundled.homedir);
    assert.equal(result.java_home, project.homedir);
    assert.equal(result.java_version, 8);
});

test("discovery ranks qualified environment JDKs before managers and common directories", async () => {
    const s = setup();
    const environment = s.addRuntime(25, { source: ["JAVA_HOME"] });
    s.discovered.push(
        s.addRuntime(24, { source: ["JDK_HOME"] }),
        s.addRuntime(27, { source: ["SDKMAN"] }),
        s.addRuntime(28),
        environment,
    );
    assert.equal((await s.api.resolveRequirements()).tooling_jre, environment.homedir);
});

test("discovery prefers JDK_HOME, then JAVA_HOME, then PATH", async () => {
    const s = setup();
    const preferred = s.addRuntime(25, { source: ["JDK_HOME"] });
    s.discovered.push(
        s.addRuntime(27, { source: ["PATH"] }),
        s.addRuntime(26, { source: ["JAVA_HOME"] }),
        preferred,
    );
    assert.equal((await s.api.resolveRequirements()).tooling_jre, preferred.homedir);
});

test("discovery prefers the newest JDK within the same source rank", async () => {
    const s = setup();
    s.discovered.push(s.addRuntime(25), s.addRuntime(27));
    assert.equal((await s.api.resolveRequirements()).tooling_jre_version, 27);
});

test("discovery excludes installations missing the runtime libraries", async () => {
    const s = setup();
    const valid = s.addRuntime(25);
    s.discovered.push(s.addRuntime(27, { valid: false }), valid);
    assert.equal((await s.api.resolveRequirements()).tooling_jre, valid.homedir);
});

for (const preference of ["java.jdt.ls.java.home", "java.home"]) {
    test(`a missing ${preference} path is rejected without attempting discovery`, async () => {
        const s = setup();
        s.preferences[preference] = path.join(path.parse(__dirname).root, "missing-jdk");
        s.discovered.push(s.addRuntime(25));
        await assert.rejects(s.api.resolveRequirements(), error =>
            error.message.includes(preference) && error.message.includes("missing or inaccessible folder"));
        assert.equal(s.calls.discovery, 0);
    });
}

test("an explicitly configured JRE is rejected as not being a JDK", async () => {
    const s = setup();
    s.preferences["java.jdt.ls.java.home"] = s.addRuntime(25, { jdk: false }).homedir;
    await assert.rejects(s.api.resolveRequirements(), /does not point to a JDK/);
});

test("a configured bin directory is rejected with actionable guidance", async () => {
    const s = setup();
    const jdk = s.addRuntime(25);
    const bin = path.join(jdk.homedir, "bin");
    s.files.add(bin);
    s.preferences["java.jdt.ls.java.home"] = bin;
    await assert.rejects(s.api.resolveRequirements(), /'bin' should be removed/);
});

test("runtime discovery failures reject instead of leaving requirements unresolved", async () => {
    const s = setup();
    s.jdkUtils.findRuntimes = async () => { throw new Error("Discovery failed"); };
    await assert.rejects(s.api.resolveRequirements(), /Discovery failed/);
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
    assert.equal(await s.api.resolveRequirements(), actual);
    assert.equal(s.calls.inspection, 0);
    assert.equal(s.calls.discovery, 0);
});

test("an active extension without the requirements API falls back to runtime resolution", async () => {
    const s = setup("1.38.0");
    s.extension.isActive = true;
    const jdk = s.addRuntime(17);
    s.discovered.push(jdk);
    assert.equal((await s.api.resolveRequirements()).tooling_jre, jdk.homedir);
});

test("an under-minimum runtime exported by the language extension cannot report readiness", async () => {
    const s = setup();
    s.extension.isActive = true;
    s.extension.exports.javaRequirement = {
        tooling_jre: s.addRuntime(24).homedir,
        tooling_jre_version: 24,
    };
    s.discovered.push(s.addRuntime(25));
    await assert.rejects(s.api.resolveRequirements(), /Java 25 or more recent is required/);
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    assert.equal(s.calls.discovery, 0);
});

test("runtime entries expose the same tooling minimum and selected runtime as readiness", async () => {
    const s = setup();
    const bundled = s.addRuntime(25, { embedded: true });
    const project = s.addRuntime(8);
    s.discovered.push(project);
    s.preferences["java.configuration.runtimes"] = [{ path: project.homedir, default: true }];
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.requiredJdkVersion, 25);
    assert.equal(entries.javaDotHome, bundled.homedir);
    assert.equal(entries.toolingJreVersion, 25);
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
    await assert.rejects(s.api.resolveRequirements(), /'redhat.java' is not installed/);
    assert.equal(await s.loadRuntimeView().validateJavaRuntime(), false);
    const entries = await s.loadRuntimeView().findJavaRuntimeEntries();
    assert.equal(entries.requiredJdkVersion, 25);
    assert.match(entries.javaHomeError, /'redhat.java' is not installed/);
});
