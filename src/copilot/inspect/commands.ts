import { DocumentSymbol, TextDocument, Range, Selection } from "vscode";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';
export const COMMAND_INSPECT_RANGE = 'java.copilot.inspect.range';

export function registerCommands() {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: DocumentSymbol) => {
        const copilot = new InspectionCopilot();
        void copilot.inspectClass(document, clazz);
    });

    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        const copilot = new InspectionCopilot();
        void copilot.inspectRange(document, range);
    });
}
