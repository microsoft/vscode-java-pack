import { CodeLens, CodeLensProvider, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { getTopLevelClassesOfDocument, logger } from "../utils";
import { COMMAND_INSPECT_CLASS } from "./commands";

export class InspectActionCodeLensProvider implements CodeLensProvider {
    private inspectCodeLenses: Map<Uri, CodeLens[]> = new Map();
    private emitter: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.emitter.event;

    public install(context: ExtensionContext): InspectActionCodeLensProvider {
        logger.debug('[InspectCodeLensProvider] install...');
        context.subscriptions.push(
            languages.registerCodeLensProvider({ language: 'java' }, this)
        );
        return this;
    }

    public async rerender(document: TextDocument) {
        if (document.languageId !== 'java') return;
        logger.debug('[InspectCodeLensProvider] rerender inspect codelenses...');
        const docCodeLenses: CodeLens[] = [];
        const classes = await getTopLevelClassesOfDocument(document);
        classes.forEach(clazz => docCodeLenses.push(new CodeLens(clazz.range, {
            title: "Rewrite with new syntax",
            command: COMMAND_INSPECT_CLASS,
            arguments: [document, clazz]
        })));
        this.inspectCodeLenses.set(document.uri, docCodeLenses);
        this.emitter.fire();
    }

    public provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.inspectCodeLenses.get(document.uri) ?? [];
    }
}