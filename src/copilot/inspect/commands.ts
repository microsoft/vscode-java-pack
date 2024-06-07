import { TextDocument, Range, Selection, commands, window, Uri, env } from "vscode";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";
import { Inspection, InspectionProblem } from "./Inspection";
import { logger, sendEvent, uncapitalize } from "../utils";
import { SymbolNode } from "./SymbolNode";
import { DocumentRenderer } from "./DocumentRenderer";
import InspectionCache from "./InspectionCache";
import path from "path";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_INSPECT_MORE = 'java.copilot.inspect.more';
export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';
export const COMMAND_FIX_INSPECTION = 'java.copilot.inspection.fix';
export const COMMAND_IGNORE_INSPECTIONS = 'java.copilot.inspection.ignore';

const LEARN_MORE_RESPONSE_FILTERED = 'https://docs.github.com/en/copilot/configuring-github-copilot/configuring-github-copilot-settings-on-githubcom#enabling-or-disabling-duplication-detection';

export function registerCommands(copilot: InspectionCopilot, renderer: DocumentRenderer) {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: SymbolNode) => {
        try {
            sendEvent('java.copilot.inspection.classInspectingStarted');
            await copilot.inspectClass(document, clazz);
            sendEvent('java.copilot.inspection.classInspectingDone');
        } catch (e) {
            sendEvent('java.copilot.inspection.classInspectingFailed');
            showErrorMessage(e, document, clazz);
            logger.error(`Failed to inspect class "${clazz.symbol.name}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_MORE, async (document: TextDocument) => {
        try {
            sendEvent('java.copilot.inspection.moreInspectingStarted');
            await copilot.inspectMore(document);
            sendEvent('java.copilot.inspection.moreInspectingDone');
        } catch (e) {
            sendEvent('java.copilot.inspection.moreInspectingFailed');
            showErrorMessage(e, document);
            logger.error(`Failed to get more suggestions for document "${document.fileName}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range) => {
        try {
            sendEvent('java.copilot.inspection.rangeInspectingStarted');
            await copilot.inspectRange(document, range);
            sendEvent('java.copilot.inspection.rangeInspectingDone');
        } catch (e) {
            sendEvent('java.copilot.inspection.rangeInspectingFailed');
            showErrorMessage(e, document, range);
            logger.error(`Failed to inspect range of "${path.basename(document.fileName)}".`, e);
            throw e;
        }
        renderer.rerender(document);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_FIX_INSPECTION, async (problem: InspectionProblem, solution: string, source: string) => {
        // source is where is this command triggered from, e.g. "gutter", "codelens", "diagnostic"
        const range = Inspection.getIndicatorRangeOfInspection(problem);
        sendEvent('java.copilot.inspection.fixingTriggered', { code: problem.code, problem: problem.description, solution, source });
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.start),
            initialRange: new Range(range.start, range.start)
        });
    });

    instrumentOperationAsVsCodeCommand(COMMAND_IGNORE_INSPECTIONS, async (document: TextDocument, symbol?: SymbolNode, inspection?: Inspection) => {
        InspectionCache.ignoreInspections(document, symbol, inspection);
        sendEvent('java.copilot.inspection.inspectionIgnored', inspection ? { problem: inspection.problem.description, solution: inspection.solution } : {});
        renderer.rerender(document);
    });
}

function showErrorMessage(e: unknown, document: TextDocument, target?: SymbolNode | Range) {
    let message = !target ?
        `Failed to inspect document "${path.basename(document.fileName)}", ${e}` :
        target instanceof Range ?
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
