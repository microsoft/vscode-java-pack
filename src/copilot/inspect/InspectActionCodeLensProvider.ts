import { CodeLens, CodeLensProvider, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { getFirstLevelClassesOfDoc, logger } from "../utils";
import { COMMAND_INSPECT_CLASS } from "./commands";

export class InspectActionCodeLensProvider implements CodeLensProvider {
    private inspectCodeLenses: Map<Uri, CodeLens[]> = new Map();
    private emitter: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.emitter.event;

    install(context: ExtensionContext): InspectActionCodeLensProvider {
        logger.debug('[InspectCodeLensProvider] install...');
        context.subscriptions.push(
            languages.registerCodeLensProvider({ language: 'java' }, this)
        );
        return this;
    }

    async rerender(document: TextDocument) {
        logger.debug('[InspectCodeLensProvider] rerender inspect codelenses...');
        if (document.languageId !== 'java') return;
        const docCodeLenses: CodeLens[] = [];
        const classes = await getFirstLevelClassesOfDoc(document);
        classes.forEach(clazz => docCodeLenses.push(new CodeLens(clazz.range, {
            title: "Rewrite with new syntax",
            command: COMMAND_INSPECT_CLASS,
            arguments: [document, clazz]
        })));
        this.inspectCodeLenses.set(document.uri, docCodeLenses);
        this.refresh();
    }

    provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.inspectCodeLenses.get(document.uri) ?? [];
    }

    refresh(): void {
        this.emitter.fire();
    }
}