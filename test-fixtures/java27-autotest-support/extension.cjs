// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const vscode = require("vscode");

const COMMAND = "java27.autotest.insertUnresolvedTypeAfterClose";
const SOURCE_LEVEL = "org.eclipse.jdt.core.compiler.source";
const INSERTION = "MissingJava27Type sentinel;";
const INSERTION_LINE = 3;
const CHANNEL = "Java 27 AutoTest";
const COMPLETED = "REOPEN_INSERTION_CONFIRMED";

const logicalText = text => text.replace(/\r\n/g, "\n");
const hash = text => createHash("sha256").update(logicalText(text)).digest("hex");

async function waitFor(check, description, deadline) {
    while (Date.now() < deadline) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${description}`);
}

async function beforeDeadline(promise, description, deadline) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)),
                    Math.max(0, deadline - Date.now()));
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

async function insertAfterClose(output) {
    const deadline = Date.now() + 60_000;
    const record = (phase, fields = {}) => output.info(JSON.stringify({
        time: new Date().toISOString(), phase, ...fields,
    }));
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert(folder, "The Java 27 fixture workspace must be open");
    const uri = vscode.Uri.joinPath(folder.uri, "src", "main", "java", "example", "PrimitivePatterns.java");
    const isTarget = candidate => candidate.toString() === uri.toString();
    const document = vscode.workspace.textDocuments.find(candidate => isTarget(candidate.uri));
    assert(document && !document.isClosed, "PrimitivePatterns.java must be an open text document");
    assert(!document.isDirty, "Refusing to close a document with unsaved edits");
    const original = await fs.readFile(uri.fsPath, "utf8");
    assert.equal(logicalText(document.getText()), logicalText(original), "Editor and disk contents differ");
    assert(!original.includes(INSERTION), "The unresolved type must not already exist");

    const extension = vscode.extensions.getExtension("redhat.java");
    assert(extension, "Language Support for Java is not installed");
    const java = await beforeDeadline(extension.activate(), "Java extension activation", deadline);
    assert(typeof java?.serverReady === "function" && typeof java?.getProjectSettings === "function",
        "Language Support for Java must expose serverReady and getProjectSettings");
    assert.equal(await beforeDeadline(java.serverReady(), "the standard Java server", deadline), true);
    record("initial-document", { uri: uri.toString(), javaVersion: extension.packageJSON.version,
        documentVersion: document.version, textHash: hash(original) });

    const roundTrip = async phase => {
        const settings = await beforeDeadline(java.getProjectSettings(uri.toString(), [SOURCE_LEVEL]), phase, deadline);
        assert.equal(settings?.[SOURCE_LEVEL], "27", "The Java server must confirm source compliance 27");
        record(phase, { sourceLevel: settings[SOURCE_LEVEL] });
    };
    let closed = false;
    const closeSubscription = vscode.workspace.onDidCloseTextDocument(candidate => {
        if (candidate === document) {
            closed = true;
            record("client-document-closed", { isClosed: candidate.isClosed });
        }
    });
    try {
        const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
            tab.input instanceof vscode.TabInputText && isTarget(tab.input.uri));
        assert(tabs.length > 0, "PrimitivePatterns.java must have a text editor tab");
        assert.equal(await beforeDeadline(vscode.window.tabGroups.close(tabs), "closing the editor tabs", deadline), true,
            "VS Code refused to close the target editor tabs");
        await waitFor(() => closed && document.isClosed
            && !vscode.workspace.textDocuments.some(candidate => isTarget(candidate.uri)),
        "the actual text-document close event", deadline);
    } finally {
        closeSubscription.dispose();
    }

    // JDT processes didClose synchronously; a following request on the same connection is the server barrier.
    await roundTrip("server-close-round-trip");
    assert.equal(await fs.readFile(uri.fsPath, "utf8"), original, "The source changed while closing");
    const lines = original.split("\n");
    assert(lines.length >= INSERTION_LINE, "The fixture is missing the insertion line");
    lines.splice(INSERTION_LINE, 0, INSERTION);
    const updated = lines.join("\n");
    let diagnosticEvents = 0;
    let contentChanges = 0;
    const errors = () => vscode.languages.getDiagnostics(uri).filter(diagnostic =>
        diagnostic.severity === vscode.DiagnosticSeverity.Error);
    const diagnosticsSubscription = vscode.languages.onDidChangeDiagnostics(event => {
        if (event.uris.some(isTarget)) {
            diagnosticEvents++;
            record("target-diagnostics", { errors: errors().map(diagnostic => ({
                code: diagnostic.code, message: diagnostic.message, range: diagnostic.range,
            })) });
        }
    });
    const changeSubscription = vscode.workspace.onDidChangeTextDocument(event => {
        if (isTarget(event.document.uri)) {
            contentChanges += event.contentChanges.length;
            record("client-content-change", { changes: event.contentChanges });
        }
    });
    try {
        await fs.writeFile(uri.fsPath, updated);
        record("disk-written", { textHash: hash(updated), insertions: updated.split(INSERTION).length - 1 });
        const reopened = await beforeDeadline(vscode.workspace.openTextDocument(uri), "a fresh text document", deadline);
        assert.notEqual(reopened, document, "Reopening must create a new text-document lifecycle");
        assert(!reopened.isClosed, "The replacement text document is closed");
        assert.equal(logicalText(reopened.getText()), logicalText(updated), "The reopened text differs from disk");
        await beforeDeadline(vscode.window.showTextDocument(reopened, { preview: false }), "showing the document", deadline);
        await roundTrip("server-open-round-trip");
        record("full-document-reopened", { documentVersion: reopened.version, textHash: hash(reopened.getText()) });
        await waitFor(() => {
            const current = errors();
            assert(!current.some(diagnostic => diagnostic.message.includes("Duplicate field")),
                "The Java server published a duplicate-field diagnostic after full reopen");
            if (diagnosticEvents === 0 || current.length !== 1) {
                return false;
            }
            const diagnostic = current[0];
            const code = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
            return String(code) === "16777218"
                && diagnostic.message === "MissingJava27Type cannot be resolved to a type"
                && diagnostic.range.start.line === INSERTION_LINE;
        }, "one fresh target-file unresolved-type diagnostic", deadline);
        assert.equal(contentChanges, 0, "The insertion must not also produce incremental text edits");
        assert.equal(await fs.readFile(uri.fsPath, "utf8"), updated, "The inserted source changed unexpectedly");
        record("insertion-verified", { errors: 1, diagnosticEvents, contentChanges, textHash: hash(updated) });
        output.info(COMPLETED);
    } finally {
        diagnosticsSubscription.dispose();
        changeSubscription.dispose();
    }
}

function activate(context) {
    const output = vscode.window.createOutputChannel(CHANNEL, { log: true });
    context.subscriptions.push(output, vscode.commands.registerCommand(COMMAND, async () => {
        output.clear();
        try {
            await insertAfterClose(output);
        } catch (error) {
            output.error(`REOPEN_FAILED ${error.stack ?? error.message}`);
            vscode.window.showErrorMessage(`Java 27 AutoTest document reopen failed: ${error.message}`);
            throw error;
        }
    }));
}

module.exports = { activate };
