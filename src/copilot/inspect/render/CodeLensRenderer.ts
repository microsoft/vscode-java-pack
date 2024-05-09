/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CodeLens, CodeLensProvider, Command, Range, Disposable, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger, uncapitalize } from "../../../copilot/utils";
import { COMMAND_IGNORE_INSPECTIONS, COMMAND_FIX_INSPECTION } from "../commands";
import { capitalize } from "lodash";
import _ from "lodash";

export class CodeLensRenderer implements InspectionRenderer {
    private readonly codeLenses: Map<Uri, InspectionCodeLens[]> = new Map();
    private readonly provider = new InspectionCodeLensProvider(this.codeLenses);
    private disposableRegistry: Disposable | undefined;

    public install(context: ExtensionContext): InspectionRenderer {
        if (this.disposableRegistry) return this;
        logger.debug(`[CodeLensRenderer] install`);
        this.disposableRegistry = languages.registerCodeLensProvider({ language: 'java' }, this.provider);
        context.subscriptions.push(this.disposableRegistry);
        return this;
    }

    public uninstall(): void {
        if (!this.disposableRegistry) return;
        logger.debug(`[CodeLensRenderer] uninstall`);
        this.codeLenses.clear();
        this.disposableRegistry.dispose();
        this.provider.refresh();
        this.disposableRegistry = undefined;
    }

    public clear(document?: TextDocument): void {
        if (document) {
            this.codeLenses?.set(document.uri, []);
        } else {
            this.codeLenses.clear();
        }
        this.provider.refresh();
    }

    public renderInspections(document: TextDocument, inspections: Inspection[]): void {
        if (inspections.length < 1 || !this.codeLenses) {
            return;
        }
        const oldItems = this.codeLenses.get(document.uri) ?? [];
        const oldIds: string[] = _.uniq(oldItems).map(c => c.inspection.id);
        const newIds: string[] = inspections.map(i => i.id);
        const toKeep: InspectionCodeLens[] = _.intersection(oldIds, newIds).map(id => oldItems.find(c => c.inspection.id === id)!) ?? [];
        const toAdd: InspectionCodeLens[] = _.difference(newIds, oldIds).map(id => inspections.find(i => i.id === id)!)
            .flatMap(i => CodeLensRenderer.toCodeLenses(document, i));
        this.codeLenses.set(document.uri, [...toKeep, ...toAdd]);
        this.provider.refresh();
    }

    private static toCodeLenses(document: TextDocument, inspection: Inspection): InspectionCodeLens[] {
        const codeLenses = [];
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const inspectionCodeLens = new InspectionCodeLens(inspection, range, {
            title: capitalize(inspection.solution),
            tooltip: inspection.problem.description,
            command: COMMAND_FIX_INSPECTION,
            arguments: [inspection.problem, inspection.solution, 'codelenses']
        });
        codeLenses.push(inspectionCodeLens);

        const ignoreCodeLens = new InspectionCodeLens(inspection, range, {
            title: 'Ignore',
            tooltip: `Ignore "${uncapitalize(inspection.problem.description)}"`,
            command: COMMAND_IGNORE_INSPECTIONS,
            arguments: [document, inspection.symbol, inspection]
        });
        codeLenses.push(ignoreCodeLens);
        return codeLenses;
    }
}

class InspectionCodeLens extends CodeLens {
    public constructor(public readonly inspection: Inspection, range: Range, command?: Command) {
        super(range, command);
    }
}

class InspectionCodeLensProvider implements CodeLensProvider {
    private readonly emitter: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.emitter.event;

    constructor(private readonly codeLenses: Map<Uri, CodeLens[]>) { }

    provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.codeLenses.get(document.uri) ?? [];
    }

    refresh(): void {
        this.emitter.fire();
    }
}

