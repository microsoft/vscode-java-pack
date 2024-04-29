/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, Diagnostic, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, Range, Selection, TextDocument, languages } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger } from "../../../copilot/utils";
import { COMMAND_FIX } from "../commands";

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
        const newDiagnostics: Diagnostic[] = inspections.map(s => DiagnosticRenderer.toDiagnostic(s));
        const newDiagnosticsMessages = newDiagnostics.map(d => d.message.trim());
        const existingDiagnostics = this.diagnostics.get(document.uri) ?? [];
        const leftDiagnostics = existingDiagnostics.filter(d => !newDiagnosticsMessages.includes(d.message.trim()));
        newDiagnostics.push(...leftDiagnostics);
        this.diagnostics.set(document.uri, newDiagnostics);
    }

    private static toDiagnostic(inspection: Inspection): Diagnostic {
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const severiy = inspection.severity.toUpperCase() === 'HIGH' ? DiagnosticSeverity.Information : DiagnosticSeverity.Hint;
        const diagnostic = new Diagnostic(range, inspection.problem.description, severiy);
        diagnostic.source = DIAGNOSTICS_GROUP;
        //@ts-ignore
        diagnostic.additional = inspection;
        return diagnostic;
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const inspection: Inspection = diagnostic.additional as Inspection;
        const action: CodeAction = {
            title: inspection.solution,
            diagnostics: [diagnostic],
            kind: CodeActionKind.RefactorRewrite,
            command: {
                title: diagnostic.message,
                command: COMMAND_FIX,
                arguments: [inspection.problem, inspection.solution, 'diagnostics']
            }
        };
        actions.push(action);
    }
    return actions;
}
