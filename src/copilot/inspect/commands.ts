import { TextDocument, Range, Selection, commands, window } from "vscode";
import { instrumentOperationAsVsCodeCommand, sendInfo } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";
import { Inspection, InspectionProblem } from "./Inspection";
import { logger, uncapitalize } from "../utils";
import { SymbolNode } from "./SymbolNode";
import { DocumentRenderer } from "./DocumentRenderer";
import InspectionCache from "./InspectionCache";
import path from "path";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';
export const COMMAND_FIX_INSPECTION = 'java.copilot.inspection.fix';
export const COMMAND_IGNORE_INSPECTIONS = 'java.copilot.inspection.ignore';

export function registerCommands(copilot: InspectionCopilot, renderer: DocumentRenderer) {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: SymbolNode) => {
        try {
            await copilot.inspectClass(document, clazz);
        } catch (e) {
            window.showErrorMessage(`Failed to inspect class "${clazz.symbol.name}" with error ${e}.`);
            logger.error(`Failed to inspect class "${clazz.symbol.name}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        try {
            await copilot.inspectRange(document, range);
        } catch (e) {
            window.showErrorMessage(`Failed to inspect range of "${path.basename(document.fileName)}" with error ${e}.`);
            logger.error(`Failed to inspect range of "${path.basename(document.fileName)}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_FIX_INSPECTION, async (problem: InspectionProblem, solution: string, source: string) => {
        // source is where is this command triggered from, e.g. "gutter", "codelens", "diagnostic"
        const range = Inspection.getIndicatorRangeOfInspection(problem);
        sendInfo(`${COMMAND_FIX_INSPECTION}.info`, { problem: problem.description, solution, source });
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.end),
            initialRange: range
        });
    });

    instrumentOperationAsVsCodeCommand(COMMAND_IGNORE_INSPECTIONS, async (document: TextDocument, symbol?: SymbolNode, inspection?: Inspection) => {
        if (inspection) {
            sendInfo(`${COMMAND_IGNORE_INSPECTIONS}.info`, { problem: inspection.problem.description, solution: inspection.solution });
        }
        InspectionCache.invalidateInspectionCache(document, symbol, inspection);
        renderer.rerender(document);
    });
}
