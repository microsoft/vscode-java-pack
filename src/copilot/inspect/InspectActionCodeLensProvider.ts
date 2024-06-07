import { CodeLens, CodeLensProvider, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { getTopLevelClassesOfDocument, logger } from "../utils";
import { COMMAND_IGNORE_INSPECTIONS, COMMAND_INSPECT_CLASS, COMMAND_INSPECT_MORE } from "./commands";
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
        logger.trace('[InspectCodeLensProvider] generate inspect codelenses...');
        const documentCodeLenses: CodeLens[] = [];
        const classes = await getTopLevelClassesOfDocument(document);
        const clazz = classes?.[0];
        const hasInspections = await InspectionCache.hasCache(document);

        if (hasInspections) {
            documentCodeLenses.push(
                new CodeLens(clazz.range, {
                    title: "✨ Get more suggestions",
                    command: COMMAND_INSPECT_MORE,
                    arguments: [document]
                }),
                new CodeLens(clazz.range, {
                    title: "Ignore all suggestions",
                    command: COMMAND_IGNORE_INSPECTIONS,
                    arguments: [document, clazz]
                })
            );
        } else {
            documentCodeLenses.push(
                new CodeLens(clazz.range, {
                    title: "✨ Rewrite with new Java syntax",
                    command: COMMAND_INSPECT_CLASS,
                    arguments: [document, clazz]
                })
            );
        }

        logger.trace('[InspectCodeLensProvider] show inspect codelenses...');
        this.inspectCodeLenses.set(document.uri, documentCodeLenses);
        this.emitter.fire();
    }

    public provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.inspectCodeLenses.get(document.uri) ?? [];
    }
}