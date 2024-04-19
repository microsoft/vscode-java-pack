import { DocumentSymbol, TextDocument, Range, Selection, commands } from "vscode";
import { addContextProperty, instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";
import { Inspection } from "./Inspection";
import { uncapitalize } from "../utils";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';
export const COMMAND_FIX = 'java.copilot.fix.inspection';

export function registerCommands() {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: DocumentSymbol) => {
        const copilot = new InspectionCopilot();
        void copilot.inspectClass(document, clazz);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        const copilot = new InspectionCopilot();
        void copilot.inspectRange(document, range);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_FIX, async (problem: Inspection['problem'], solution: string, source) => {
        const range = Inspection.calculateHintPosition(problem);
        addContextProperty('problem', problem.description);
        addContextProperty('source', source);
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.end),
            initialRange: range
        });
    });
}
