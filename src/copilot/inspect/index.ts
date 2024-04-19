import { ExtensionContext, window, workspace } from "vscode";
import { registerCommands } from "./commands";
import { InspectActionCodeLensProvider } from "./InspectActionCodeLensProvider";

export const DEPENDENT_EXTENSIONS = ['github.copilot-chat', 'redhat.java'];

export async function activateCopilotInspection(context: ExtensionContext): Promise<void> {

    registerCommands();

    const inspectActionCodeLenses = new InspectActionCodeLensProvider().install(context);

    context.subscriptions.push(
        workspace.onDidOpenTextDocument(doc => inspectActionCodeLenses.rerender(doc)), // Rerender class codelens
    );
    window.visibleTextEditors.forEach(editor => inspectActionCodeLenses.rerender(editor.document));
}
