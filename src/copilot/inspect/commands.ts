import { TextDocument, Range, Selection, commands } from "vscode";
import { instrumentOperationAsVsCodeCommand, sendInfo } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";
import { Inspection, InspectionProblem } from "./Inspection";
import { uncapitalize } from "../utils";
import { SymbolNode } from "./SymbolNode";
import { DocumentRenderer } from "./DocumentRenderer";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';
export const COMMAND_FIX = 'java.copilot.fix.inspection';

export function registerCommands(copilot: InspectionCopilot, renderer: DocumentRenderer) {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: SymbolNode) => {
        await copilot.inspectClass(document, clazz);
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        await copilot.inspectRange(document, range);
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_FIX, async (problem: InspectionProblem, solution: string, source: string) => {
        // source is where is this command triggered from, e.g. "gutter", "codelens", "diagnostic"
        const range = Inspection.getIndicatorRangeOfInspection(problem);
        sendInfo(`${COMMAND_FIX}.info`, { problem: problem.description, solution, source });
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.end),
            initialRange: range
        });
    });
}
