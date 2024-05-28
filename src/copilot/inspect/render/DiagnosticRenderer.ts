/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, Diagnostic, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, Range, Selection, TextDocument, languages } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger } from "../../../copilot/utils";
import { COMMAND_FIX_INSPECTION } from "../commands";
import _ from "lodash";

const DIAGNOSTICS_GROUP = 'java.copilot.inspection.diagnostics';

export class DiagnosticRenderer implements InspectionRenderer {
    private diagnostics: DiagnosticCollection | undefined;

    public install(context: ExtensionContext): InspectionRenderer {
        if (this.diagnostics) return this;
        logger.debug('[DiagnosticRenderer] install...');
        this.diagnostics = languages.createDiagnosticCollection(DIAGNOSTICS_GROUP);
        context.subscriptions.push(this.diagnostics);
        return this;
    }

    public uninstall(): void {
        if (!this.diagnostics) return;
        logger.debug('[DiagnosticRenderer] uninstall...');
        this.diagnostics.clear();
        this.diagnostics.dispose();
        this.diagnostics = undefined;
    }

    public clear(document?: TextDocument): void {
        if (document) {
            this.diagnostics?.set(document.uri, []);
        } else {
            this.diagnostics?.clear();
        }
    }

    public renderInspections(document: TextDocument, inspections: Inspection[]): void {
        if (inspections.length < 1 || !this.diagnostics) {
            return;
        }
        const oldItems: readonly InspectionDiagnostic[] = (this.diagnostics.get(document.uri) ?? []) as InspectionDiagnostic[];
        const oldIds: string[] = _.uniq(oldItems).map(c => c.inspection.id);
        const newIds: string[] = inspections.map(i => i.id);
        const toKeep: InspectionDiagnostic[] = _.intersection(oldIds, newIds).map(id => oldItems.find(c => c.inspection.id === id)!) ?? [];
        const toAdd: InspectionDiagnostic[] = _.difference(newIds, oldIds).map(id => inspections.find(i => i.id === id)!).map(i => new InspectionDiagnostic(i));
        this.diagnostics.set(document.uri, [...toKeep, ...toAdd]);
    }
}

class InspectionDiagnostic extends Diagnostic {
    public constructor(public readonly inspection: Inspection) {
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const severiy = inspection.severity.toUpperCase() === 'HIGH' ? DiagnosticSeverity.Information : DiagnosticSeverity.Hint;
        super(range, inspection.problem.description, severiy);
        this.source = DIAGNOSTICS_GROUP;
    }
}

export async function fixDiagnostic(document: TextDocument, _range: Range | Selection, context: CodeActionContext, _token: CancellationToken): Promise<CodeAction[]> {
    if (document?.languageId !== 'java') {
        return [];
    }
    const actions: CodeAction[] = [];
    for (const diagnostic of context.diagnostics) {
        if (diagnostic.source !== DIAGNOSTICS_GROUP) {
            continue;
        }
        const inspection: Inspection = (diagnostic as InspectionDiagnostic).inspection as Inspection;
        const fixAction: CodeAction = {
            title: inspection.solution,
            diagnostics: [diagnostic],
            kind: CodeActionKind.RefactorRewrite,
            isPreferred: true,
            command: {
                title: diagnostic.message,
                command: COMMAND_FIX_INSPECTION,
                arguments: [inspection.problem, inspection.solution, 'diagnostics']
            }
        };
        actions.push(fixAction);
    }
    return actions;
}
