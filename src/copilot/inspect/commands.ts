import { TextDocument, Range, Selection, commands, window, Uri, env } from "vscode";
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

const LEARN_MORE_RESPONSE_FILTERED = 'https://docs.github.com/en/copilot/configuring-github-copilot/configuring-github-copilot-settings-on-githubcom#enabling-or-disabling-duplication-detection';

export function registerCommands(copilot: InspectionCopilot, renderer: DocumentRenderer) {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: SymbolNode) => {
        try {
            await copilot.inspectClass(document, clazz);
        } catch (e) {
            showErrorMessage(e, document, clazz);
            logger.error(`Failed to inspect class "${clazz.symbol.name}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        try {
            await copilot.inspectRange(document, range);
        } catch (e) {
            showErrorMessage(e, document, range);
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
            position: range?.start,
            initialSelection: new Selection(range!.start, range!.start),
            initialRange: new Range(range!.start, range!.start)
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

function showErrorMessage(e: unknown, document: TextDocument, target: SymbolNode | Range) {
    let message = target instanceof Range ?
        `Failed to inspect range of "${path.basename(document.fileName)}", ${e}` :
        `Failed to inspect class "${target.symbol.name}", ${e}`;

    const actions = new Map<string, () => void>();
    if (e instanceof Error && e.message.toLowerCase().includes('response got filtered')) {
        actions.set('Learn more', () => env.openExternal(Uri.parse(LEARN_MORE_RESPONSE_FILTERED)));
        message += ', possibly because it matches existing public code';
    }
    window.showErrorMessage(`${message}.`, ...actions.keys()).then(choice => {
        if (choice) {
            actions.get(choice)!();
        }
    });
}
