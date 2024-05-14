import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, ExtensionContext, TextDocument, languages, window, workspace, Range, Selection, extensions } from "vscode";
import { COMMAND_INSPECT_RANGE, registerCommands } from "./commands";
import { DocumentRenderer } from "./DocumentRenderer";
import { fixDiagnostic } from "./render/DiagnosticRenderer";
import InspectionCache from "./InspectionCache";
import { logger } from "../utils";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";

export const DEPENDENT_EXTENSIONS = ['github.copilot-chat', 'redhat.java'];

export async function activateCopilotInspection(context: ExtensionContext): Promise<void> {
    logger.info('Waiting for dependent extensions to be ready...');
    await waitUntilExtensionsActivated(DEPENDENT_EXTENSIONS);
    logger.info('Activating Java Copilot features...');
    doActivate(context);
    logger.info('Java Copilot features activated.');
}

export function doActivate(context: ExtensionContext): void {
    const copilot = new InspectionCopilot();
    const renderer: DocumentRenderer = new DocumentRenderer().install(context);
    registerCommands(copilot, renderer);

    context.subscriptions.push(
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: fixDiagnostic }), // Fix using Copilot
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: rewrite }), // Inspect using Copilot
        workspace.onDidOpenTextDocument(doc => renderer.rerender(doc)), // Rerender class codelens and cached suggestions on document open
        workspace.onDidChangeTextDocument(e => renderer.rerender(e.document, true)), // Rerender class codelens and cached suggestions debouncely on document change
        window.onDidChangeVisibleTextEditors(editors => editors.forEach(editor => renderer.rerender(editor.document))), // rerender in case of renderers changed.
        workspace.onDidCloseTextDocument(doc => InspectionCache.invalidateInspectionCache(doc)), // Rerender class codelens and cached suggestions debouncely on document change
    );
    window.visibleTextEditors.forEach(editor => renderer.rerender(editor.document));
}

async function rewrite(document: TextDocument, range: Range | Selection, _context: CodeActionContext, _token: CancellationToken): Promise<CodeAction[]> {
    const action: CodeAction = {
        title: "Rewrite with new syntax",
        kind: CodeActionKind.RefactorRewrite,
        command: {
            title: "Rewrite selected code",
            command: COMMAND_INSPECT_RANGE,
            arguments: [document, range]
        }
    };
    return [action];
}

export async function waitUntilExtensionsActivated(extensionIds: string[], interval: number = 1500) {
    const start = Date.now();
    return new Promise<void>((resolve) => {
        if (extensionIds.every(id => extensions.getExtension(id)?.isActive)) {
            logger.info(`All dependent extensions [${extensionIds.join(', ')}] are activated.`);
            return resolve();
        }
        const notInstalledExtensionIds = extensionIds.filter(id => !extensions.getExtension(id));
        if (notInstalledExtensionIds.length > 0) {
            sendInfo('java.copilot.inspection.dependentExtensions.notInstalledExtensions', { extensionIds: `[${notInstalledExtensionIds.join(',')}]` });
            logger.info(`Dependent extensions [${notInstalledExtensionIds.join(', ')}] are not installed, setting checking interval to 10s.`);
        } else {
            logger.info(`All dependent extensions are installed, but some are not activated, keep checking interval ${interval}ms.`);
        }
        interval = notInstalledExtensionIds.length > 0 ? 10000 : interval;
        const id = setInterval(() => {
            if (extensionIds.every(id => extensions.getExtension(id)?.isActive)) {
                clearInterval(id);
                sendInfo('java.copilot.inspection.dependentExtensions.waited', { time: Date.now() - start });
                logger.info(`waited for ${Date.now() - start}ms for all dependent extensions [${extensionIds.join(', ')}] to be installed/activated.`);
                resolve();
            }
        }, interval);
    });
}