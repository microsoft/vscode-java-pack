/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CodeLens, CodeLensProvider, Disposable, Event, EventEmitter, ExtensionContext, TextDocument, Uri, languages } from "vscode";
import { Inspection, InspectionRenderer } from "..";
import { COMMAND_FIX } from "../../../copilot/commands";
import { getCachedInspectionsOfDoc } from "../cache";
import { calculateHintPosition as calculateInspectPosition, logger } from "../utils";
import path = require("path");

export class CodeLensRenderer implements InspectionRenderer {
    private readonly codeLenses: Map<Uri, CodeLens[]> = new Map();
    private readonly provider = new InspectionCodeLensProvider(this.codeLenses);
    private disposableRegitry: Disposable | undefined;

    public install(context: ExtensionContext): void {
        if (this.disposableRegitry) return;
        logger.debug(`[CodeLensRenderer] install`);
        this.disposableRegitry = languages.registerCodeLensProvider({ language: 'java' }, this.provider);
        context.subscriptions.push(this.disposableRegitry);
    }

    public uninstall(): void {
        if (!this.disposableRegitry) return;
        logger.debug(`[CodeLensRenderer] uninstall`);
        this.codeLenses.clear();
        this.disposableRegitry.dispose();
        this.provider.refresh();
        this.disposableRegitry = undefined;
    }

    public clear(document?: TextDocument): void {
        if (document) {
            this.codeLenses?.set(document.uri, []);
        } else {
            this.codeLenses.clear();
        }
        this.provider.refresh();
    }

    public async rerender(document: TextDocument): Promise<void> {
        logger.debug(`[CodeLensRenderer] rerender ${path.basename(document.uri.fsPath)}`);
        this.clear(document);
        const inspections = await getCachedInspectionsOfDoc(document);
        this.renderInspections(document, inspections);
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
        const range = calculateInspectPosition(inspection.problem);
        const codeLens = new CodeLens(range, {
            title: inspection.solution,
            tooltip: inspection.problem.description,
            command: COMMAND_FIX,
            arguments: [inspection.problem, inspection.solution, 'codelenses']
        });
        //@ts-ignore
        codeLens.additional = inspection;
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

