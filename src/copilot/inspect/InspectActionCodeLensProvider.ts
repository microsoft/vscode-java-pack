import { CodeLens, CodeLensProvider, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { getTopLevelClassesOfDocument, logger } from "../utils";
import { COMMAND_IGNORE_INSPECTIONS, COMMAND_INSPECT_CLASS } from "./commands";
import InspectionCache from "./InspectionCache";

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
        const topLevelCodeLenses: CodeLens[] = [];
        const classes = await getTopLevelClassesOfDocument(document);
        classes.map(clazz => new CodeLens(clazz.range, {
            title: "Rewrite with new Java syntax",
            command: COMMAND_INSPECT_CLASS,
            arguments: [document, clazz]
        })).forEach(codeLens => topLevelCodeLenses.push(codeLens));

        const results = await Promise.all(classes.map(clazz => InspectionCache.hasCache(document, clazz)));
        classes.filter((_, i) => results[i]).map(clazz => new CodeLens(clazz.range, {
            title: "Ignore all",
            command: COMMAND_IGNORE_INSPECTIONS,
            arguments: [document, clazz]
        })).forEach(codeLens => topLevelCodeLenses.push(codeLens));

        this.inspectCodeLenses.set(document.uri, topLevelCodeLenses);
        this.emitter.fire();
    }

    public provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.inspectCodeLenses.get(document.uri) ?? [];
    }
}