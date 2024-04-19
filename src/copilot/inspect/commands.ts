import { DocumentSymbol, TextDocument } from "vscode";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import InspectionCopilot from "./InspectionCopilot";

export const COMMAND_INSPECT_CLASS = 'java.copilot.inspect.class';

export function registerCommands() {
    instrumentOperationAsVsCodeCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: DocumentSymbol) => {
        const copilot = new InspectionCopilot();
        void copilot.inspectClass(document, clazz);
    });
}
