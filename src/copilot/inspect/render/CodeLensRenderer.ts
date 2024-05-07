/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CodeLens, CodeLensProvider, Disposable, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger } from "../../../copilot/utils";
import { COMMAND_FIX } from "../commands";

export class CodeLensRenderer implements InspectionRenderer {
    private readonly codeLenses: Map<Uri, CodeLens[]> = new Map();
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
        const newCodeLenses: CodeLens[] = inspections.map(s => CodeLensRenderer.toCodeLens(s));
        const newCodeLensesMessages = newCodeLenses.map(c => c.command?.title.trim());
        const existingCodeLenses = this.codeLenses.get(document.uri) ?? [];
        const leftCodeLenses = existingCodeLenses.filter(c => !newCodeLensesMessages.includes(c.command?.title.trim()));
        newCodeLenses.push(...leftCodeLenses);
        this.codeLenses.set(document.uri, newCodeLenses);
        this.provider.refresh();
    }

    private static toCodeLens(inspection: Inspection): CodeLens {
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const codeLens = new CodeLens(range, {
            title: inspection.solution,
            tooltip: inspection.problem.description,
            command: COMMAND_FIX,
            arguments: [inspection.problem, inspection.solution, 'codelenses']
        });
        return codeLens;
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

