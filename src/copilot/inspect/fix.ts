import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, Range, Selection, TextDocument } from 'vscode';
import { JAVA_COPILOT_FEATURE_GROUP, Inspection } from '.';
import { uncapitalize } from './utils';

export async function fixUsingCopilot(document: TextDocument, _range: Range | Selection, context: CodeActionContext, _token: CancellationToken): Promise<CodeAction[]> {
    if (document?.languageId !== 'java') {
        return [];
    }
    const actions: CodeAction[] = [];
    for (const diagnostic of context.diagnostics) {
        if (diagnostic.source !== JAVA_COPILOT_FEATURE_GROUP) {
            continue;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const inspection: Inspection = diagnostic.additional as Inspection;
        const range = diagnostic.range;
        const command = {
            title: diagnostic.message,
            command: "vscode.editorChat.start",
            arguments: [{
                autoSend: true,
                message: `/fix ${inspection.problem.description}, maybe ${uncapitalize(inspection.solution)}`,
                position: range.start,
                initialSelection: new Selection(range.start, range.end),
                initialRange: range
            }]
        };
        const action: CodeAction = {
            title: inspection.solution,
            diagnostics: [diagnostic],
            kind: CodeActionKind.RefactorRewrite,
            command
        };
        actions.push(action);
    }
    return actions;
}
