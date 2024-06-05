import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, ExtensionContext, TextDocument, languages, window, workspace, Range, Selection, extensions } from "vscode";
import { COMMAND_INSPECT_RANGE, registerCommands } from "./commands";
import { DocumentRenderer } from "./DocumentRenderer";
import { fixDiagnostic } from "./render/DiagnosticRenderer";
import InspectionCache from "./InspectionCache";
import { logger, sendEvent } from "../utils";
import InspectionCopilot from "./InspectionCopilot";

export const DEPENDENT_EXTENSIONS = ['github.copilot-chat', 'redhat.java'];

export async function activateCopilot(context: ExtensionContext): Promise<void> {
    logger.info('Waiting for dependent extensions to be ready...');
    await waitUntilExtensionsInstalled(DEPENDENT_EXTENSIONS);
    sendEvent("java.copilot.dependentExtensionsInstalled", {});
    await waitUntilExtensionsActivated(DEPENDENT_EXTENSIONS);
    sendEvent("java.copilot.dependentExtensionsActivated", {});
    logger.info('Activating Java Copilot features...');
    doActivate(context);
    sendEvent("java.copilot.activated", {});
    logger.info('Java Copilot features activated.');
}

export function doActivate(context: ExtensionContext): void {
    const copilot = new InspectionCopilot();
    const renderer: DocumentRenderer = new DocumentRenderer().install(context);
    registerCommands(copilot, renderer);

    context.subscriptions.push(
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: fixDiagnostic }), // Fix using Copilot
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: rewrite }), // Inspect using Copilot
        workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId !== 'java') return;
            sendEvent('java.copilot.javaDocumentOpened');
            renderer.rerender(doc);
        }), // Rerender class codelens and cached suggestions on document open
        workspace.onDidChangeTextDocument(e => renderer.rerender(e.document, true)), // Rerender class codelens and cached suggestions debouncely on document change
        window.onDidChangeVisibleTextEditors(editors => editors.forEach(editor => renderer.rerender(editor.document))), // rerender in case of renderers changed.
        workspace.onDidCloseTextDocument(doc => InspectionCache.invalidateInspectionCache(doc)), // Rerender class codelens and cached suggestions debouncely on document change
    );
    window.visibleTextEditors.forEach(editor => renderer.rerender(editor.document));
}

async function rewrite(document: TextDocument, range: Range | Selection, _context: CodeActionContext, _token: CancellationToken): Promise<CodeAction[]> {
    const action: CodeAction = {
        title: "Rewrite with new Java syntax",
        kind: CodeActionKind.RefactorRewrite,
        command: {
            title: "Rewrite selected code",
            command: COMMAND_INSPECT_RANGE,
            arguments: [document, range]
        }
    };
    return [action];
}

async function waitUntilExtensionsActivated(extensionIds: string[], interval: number = 1500) {
    const start = Date.now();
    return new Promise<void>((resolve) => {
        const notActivatedExtensionIds = extensionIds.filter(id => !extensions.getExtension(id)?.isActive);
        if (notActivatedExtensionIds.length == 0) {
            logger.info(`All dependent extensions [${extensionIds.join(', ')}] are activated.`);
            return resolve();
        }
        sendEvent('java.copilot.dependentExtensionsNotActivated', { notActivatedExtensionIds: notActivatedExtensionIds.join(',') });
        logger.info(`Dependent extensions [${notActivatedExtensionIds.join(', ')}] are not activated, waiting...`);
        const id = setInterval(() => {
            if (extensionIds.every(id => extensions.getExtension(id)?.isActive)) {
                clearInterval(id);
                sendEvent('java.copilot.waitDependentExtensionsActivated', { waitedTime: Date.now() - start, notActivatedExtensionIds: notActivatedExtensionIds.join(',') });
                logger.info(`waited for ${Date.now() - start}ms for all dependent extensions [${extensionIds.join(', ')}] to be activated.`);
                resolve();
            }
        }, interval);
    });
}

async function waitUntilExtensionsInstalled(extensionIds: string[]) {
    const start = Date.now();
    return new Promise<void>((resolve) => {
        const notInstalledExtensionIds = extensionIds.filter(id => !extensions.getExtension(id));
        if (notInstalledExtensionIds.length == 0) {
            logger.info(`All dependent extensions [${extensionIds.join(', ')}] are installed.`);
            return resolve();
        }
        sendEvent('java.copilot.dependentExtensionsNotInstalled', { notInstalledExtensionIds: notInstalledExtensionIds.join(',') });
        logger.info(`Dependent extensions [${notInstalledExtensionIds.join(', ')}] are not installed, waiting...`);

        const disposable = extensions.onDidChange(() => {
            if (extensionIds.every(id => extensions.getExtension(id))) {
                disposable.dispose();
                sendEvent('java.copilot.waitDependentExtensionsInstalled', { waitedTime: Date.now() - start, notInstalledExtensionIds: notInstalledExtensionIds.join(',') });
                logger.info(`waited for ${Date.now() - start}ms for all dependent extensions [${extensionIds.join(', ')}] to be installed.`);
                resolve();
            }
        });
    });
}