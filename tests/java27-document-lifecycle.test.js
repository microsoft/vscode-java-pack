// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const filename = path.join(root, "test-fixtures", "java27-autotest-support", "extension.cjs");
const source = fs.readFileSync(filename, "utf8");
const command = "java27.autotest.insertUnresolvedTypeAfterClose";
const sourceLevel = "org.eclipse.jdt.core.compiler.source";

function event() {
    const listeners = new Set();
    return {
        listeners,
        subscribe: callback => {
            listeners.add(callback);
            return { dispose: () => listeners.delete(callback) };
        },
        fire: value => listeners.forEach(callback => callback(value)),
    };
}

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function execute(options = {}) {
    const paths = options.posix ? path.posix : path.win32;
    const directory = options.posix ? "/ci/workspace with spaces" : "C:\\CI\\workspace with spaces";
    const uri = location => ({ fsPath: location, toString: () => location });
    const target = uri(paths.join(directory, "src", "main", "java", "example", "PrimitivePatterns.java"));
    const original = options.crlf
        ? "package example;\r\n\r\npublic class PrimitivePatterns {\r\n}\r\n"
        : "package example;\n\npublic class PrimitivePatterns {\n}\n";
    const state = {
        calls: [], logs: [], notifications: [], files: new Map([[target.fsPath, original]]),
        target, original, requests: 0, closeReply: deferred(), closeEvent: event(),
        diagnosticsEvent: event(), changeEvent: event(), commands: new Map(),
    };
    const originalDocument = {
        uri: target, version: 1, isClosed: false, isDirty: !!options.dirty,
        getText: () => options.staleEditor ? `${original}stale` : original,
    };
    const documents = [originalDocument];
    const diagnostics = new Map();
    class TabInputText {
        constructor(inputUri) { this.uri = inputUri; }
    }
    state.finishClose = () => {
        originalDocument.isClosed = true;
        documents.splice(0, documents.length);
        state.calls.push("document-closed");
        state.closeEvent.fire(originalDocument);
    };
    state.publish = (entries, location = target) => {
        diagnostics.set(location.toString(), entries);
        state.diagnosticsEvent.fire({ uris: [location] });
    };
    const unresolved = {
        code: "16777218", severity: 0, message: "MissingJava27Type cannot be resolved to a type",
        range: { start: { line: 3, character: 0 }, end: { line: 3, character: 17 } },
    };
    state.unresolved = unresolved;
    const vscode = {
        Uri: { joinPath: (parent, ...parts) => uri(paths.join(parent.fsPath, ...parts)) },
        TabInputText, DiagnosticSeverity: { Error: 0 },
        workspace: {
            workspaceFolders: [{ uri: uri(directory) }], textDocuments: documents,
            onDidCloseTextDocument: state.closeEvent.subscribe,
            onDidChangeTextDocument: state.changeEvent.subscribe,
            openTextDocument: async () => {
                state.calls.push("open");
                const text = state.files.get(target.fsPath);
                const reopened = options.reuseDocument ? originalDocument : {
                    uri: target, version: 1, isClosed: false,
                    getText: () => options.staleReopen ? original : options.crlf
                        ? text.replace(/\r?\n/g, "\r\n") : text,
                };
                documents.push(reopened);
                if (options.incrementalChange) {
                    state.changeEvent.fire({ document: reopened, contentChanges: [{ text: "duplicate insertion" }] });
                }
                if (options.unrelatedDiagnostics) {
                    state.publish([unresolved], uri(paths.join(directory, "Other.java")));
                } else if (options.wrongRange) {
                    state.publish([{ ...unresolved, range: { start: { line: 2 }, end: { line: 2 } } }]);
                } else if (!options.timeout) {
                    state.publish(options.duplicate ? [
                        unresolved,
                        { ...unresolved, code: "33554772", message: "Duplicate field PrimitivePatterns.sentinel" },
                    ] : [unresolved]);
                }
                return reopened;
            },
        },
        extensions: {
            getExtension: () => options.missingExtension ? undefined : {
                packageJSON: { version: "1.57.0" },
                activate: async () => ({
                    serverReady: async () => true,
                    getProjectSettings: options.missingApi ? undefined : async () => {
                        state.requests++;
                        state.calls.push(`request-${state.requests}`);
                        if (state.requests === 1 && options.deferCloseReply) {
                            await state.closeReply.promise;
                        }
                        if (options.requestFailure) {
                            throw new Error("Java workspace request failed");
                        }
                        return options.malformedReply ? {} : { [sourceLevel]: "27" };
                    },
                }),
            },
        },
        languages: {
            getDiagnostics: location => diagnostics.get(location.toString()) ?? [],
            onDidChangeDiagnostics: state.diagnosticsEvent.subscribe,
        },
        window: {
            tabGroups: {
                all: [{ tabs: [{ input: new TabInputText(target) }] }],
                close: async () => {
                    state.calls.push("close-tabs");
                    if (options.refuseClose) {
                        return false;
                    }
                    if (!options.omitCloseEvent && !options.deferCloseEvent) {
                        state.finishClose();
                    }
                    return true;
                },
            },
            showTextDocument: async () => state.calls.push("show"),
            showErrorMessage: message => state.notifications.push(message),
            createOutputChannel: () => ({
                clear: () => { state.logs.length = 0; },
                info: message => state.logs.push(message),
                error: message => state.logs.push(message),
                dispose: () => {},
            }),
        },
        commands: {
            registerCommand: (name, callback) => {
                state.commands.set(name, callback);
                return { dispose: () => state.commands.delete(name) };
            },
        },
    };
    let elapsed = 0;
    class Clock extends Date {
        static now() { return Date.now() + elapsed; }
    }
    const module = { exports: {} };
    vm.runInNewContext(source, {
        module, Date: Clock,
        require: name => name === "vscode" ? vscode : name === "node:fs/promises" ? {
            readFile: async location => state.files.get(location),
            writeFile: async (location, content) => {
                state.calls.push("write");
                state.files.set(location, content);
            },
        } : require(name),
        setTimeout: (callback, delay) => {
            if (delay === 50 && (options.timeout || options.omitCloseEvent
                || options.unrelatedDiagnostics || options.wrongRange)) {
                elapsed += 60_001;
            }
            return setTimeout(callback, delay === 50 ? 1 : 1000);
        },
        clearTimeout,
    }, { filename });
    module.exports.activate({ subscriptions: [] });
    state.run = () => state.commands.get(command)();
    return state;
}

function assertDisposed(state) {
    assert.equal(state.closeEvent.listeners.size, 0);
    assert.equal(state.diagnosticsEvent.listeners.size, 0);
    assert.equal(state.changeEvent.listeners.size, 0);
}

for (const options of [{}, { posix: true }, { crlf: true }]) {
    test(`full reopen preserves insertion semantics and confirms target diagnostics ${JSON.stringify(options)}`, async () => {
        const state = execute(options);
        await state.run();
        assert.deepEqual(state.calls, ["close-tabs", "document-closed", "request-1", "write", "open", "show", "request-2"]);
        assert.equal(state.files.get(state.target.fsPath).split("MissingJava27Type sentinel;").length - 1, 1);
        assert.equal(state.logs.at(-1), "REOPEN_INSERTION_CONFIRMED");
        assert.equal(state.notifications.length, 0);
        assertDisposed(state);
    });
}

test("a delayed server-close reply prevents the disk write", async () => {
    const state = execute({ deferCloseReply: true });
    const run = state.run();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.requests, 1);
    assert.equal(state.files.get(state.target.fsPath), state.original);
    assert(!state.calls.includes("write"));
    state.closeReply.resolve();
    await run;
    assertDisposed(state);
});

test("closing tabs alone cannot issue the server barrier or modify the source", async () => {
    const state = execute({ omitCloseEvent: true });
    await assert.rejects(state.run(), /actual text-document close event/);
    assert.equal(state.requests, 0);
    assert.equal(state.files.get(state.target.fsPath), state.original);
    assert(state.logs.at(-1).startsWith("REOPEN_FAILED"));
    assert.equal(state.notifications.length, 1);
    assertDisposed(state);
});

test("the server round trip waits for a delayed real document-close event", async () => {
    const state = execute({ deferCloseEvent: true });
    const run = state.run();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.requests, 0);
    state.finishClose();
    await run;
    assertDisposed(state);
});

for (const [options, reason] of [
    [{ dirty: true }, /unsaved edits/],
    [{ staleEditor: true }, /Editor and disk contents differ/],
    [{ missingExtension: true }, /not installed/],
    [{ missingApi: true }, /expose serverReady and getProjectSettings/],
    [{ refuseClose: true }, /refused to close the target editor tabs/],
    [{ malformedReply: true }, /source compliance 27/],
    [{ requestFailure: true }, /Java workspace request failed/],
]) {
    test(`a failed prerequisite prevents writing and surfaces an error ${JSON.stringify(options)}`, async () => {
        const state = execute(options);
        await assert.rejects(state.run(), reason);
        assert(!state.calls.includes("write"));
        assert(state.logs.at(-1).startsWith("REOPEN_FAILED"));
        assert.equal(state.notifications.length, 1);
        assertDisposed(state);
    });
}

for (const [options, reason] of [
    [{ reuseDocument: true }, /new text-document lifecycle/],
    [{ staleReopen: true }, /reopened text differs from disk/],
    [{ duplicate: true }, /duplicate-field diagnostic/],
    [{ incrementalChange: true }, /must not also produce incremental text edits/],
    [{ timeout: true }, /one fresh target-file unresolved-type diagnostic/],
    [{ unrelatedDiagnostics: true }, /one fresh target-file unresolved-type diagnostic/],
    [{ wrongRange: true }, /one fresh target-file unresolved-type diagnostic/],
]) {
    test(`invalid reopen evidence cannot produce a success marker ${JSON.stringify(options)}`, async () => {
        const state = execute(options);
        await assert.rejects(state.run(), reason);
        assert(!state.logs.includes("REOPEN_INSERTION_CONFIRMED"));
        assert(state.logs.at(-1).startsWith("REOPEN_FAILED"));
        assertDisposed(state);
    });
}

test("the plan keeps its original diagnostic and runtime assertions after helper completion", () => {
    const plan = fs.readFileSync(path.join(root, "test-plans", "java27-primitive-patterns.yaml"), "utf8");
    assert.match(plan, /extensionPaths:\r?\n    - "\.\.\/test-fixtures\/java27-autotest-support"/);
    assert.match(plan, /contains: "REOPEN_INSERTION_CONFIRMED"\r?\n      notContains: "REOPEN_FAILED"/);
    assert.match(plan, /id: "prove-semantic-analysis"[\s\S]*?contains: "MissingJava27Type sentinel;"[\s\S]*?errors: 1/);
    assert.match(plan, /id: "verify-patterns-accepted"[\s\S]*?action: "saveFile"[\s\S]*?errors: 0/);
    assert.match(plan, /contains: "JDK27_PATTERNS_PASSED"/);
    assert(!plan.includes("insertLineInFile"));
});

test("CI preserves helper logs and excludes the test extension from the pack VSIX", () => {
    const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "e2e-autotest.yml"), "utf8");
    const ignores = fs.readFileSync(path.join(root, ".vscodeignore"), "utf8");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "test-fixtures", "java27-autotest-support", "package.json")));
    assert(workflow.includes('Get-ChildItem -LiteralPath $source -File -Recurse -Force'));
    assert.match(ignores, /^test-fixtures\/\*\*$/m);
    assert.equal(manifest.private, true);
    assert.deepEqual(manifest.extensionDependencies, ["redhat.java"]);
});
