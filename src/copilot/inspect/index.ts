import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, ExtensionContext, TextDocument, languages, window, workspace, Range, Selection } from "vscode";
import { COMMAND_INSPECT_RANGE, registerCommands } from "./commands";
import { DocumentRenderer } from "./DocumentRenderer";
import { fixDiagnostic } from "./render/DiagnosticRenderer";
import InspectionCache from "./InspectionCache";

export async function activateCopilotInspection(context: ExtensionContext): Promise<void> {
    const renderer: DocumentRenderer = new DocumentRenderer().install(context);
    registerCommands(renderer);

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