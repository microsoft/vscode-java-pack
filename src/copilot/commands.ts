import { commands, TextDocument, DocumentSymbol, workspace, Range, Selection, window } from "vscode";
import { inspectRange, inspectClass, Inspection, InspectionRenderer } from "./inspect";
import { calculateHintPosition, uncapitalize } from "./inspect/utils";

export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';
export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_FIX = 'java.copilot.fix.inspection';
export const COMMAND_HIGHLIGHT = 'java.copilot.highlight.inspection';

export function registerCommands(renderer: InspectionRenderer) {
    commands.registerCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        void inspectRange(document, range).then(inspections => renderer.renderInspections(document, inspections));
    });
    commands.registerCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: DocumentSymbol) => {
        void inspectClass(document, clazz).then(inspections => renderer.renderInspections(document, inspections));
    });
    commands.registerCommand(COMMAND_FIX, async (problem: Inspection['problem'], solution: string) => {
        const range = calculateHintPosition(problem);
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.end),
            initialRange: range
        });
    });
    commands.registerCommand(COMMAND_HIGHLIGHT, async (inspection: Inspection) => {
        inspection.document && void workspace.openTextDocument(inspection.document.uri).then(document => {
            void window.showTextDocument(document).then(editor => {
                const range = document.lineAt(inspection.problem.position.line).range;
                editor.selection = new Selection(range.start, range.end);
                editor.revealRange(range);
            });
        });
    });
}