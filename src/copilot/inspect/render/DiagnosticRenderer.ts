/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, ExtensionContext, TextDocument, languages } from "vscode";
import { JAVA_COPILOT_FEATURE_GROUP, Inspection, InspectionRenderer } from "..";
import { output } from "../../output";
import { getCachedInspectionsOfDoc } from "../cache";
import { calculateHintPosition } from "../utils";
import path = require("path");

export class DiagnosticRenderer implements InspectionRenderer {
    private diagnostics: DiagnosticCollection | undefined;

    public install(context: ExtensionContext): void {
        if (this.diagnostics) return;
        output.log('[DiagnosticRenderer] install...');
        this.diagnostics = languages.createDiagnosticCollection(JAVA_COPILOT_FEATURE_GROUP);
        context.subscriptions.push(this.diagnostics);
    }

    public uninstall(): void {
        if (!this.diagnostics) return;
        output.log('[DiagnosticRenderer] uninstall...');
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

    public async rerender(document: TextDocument): Promise<void> {
        output.log(`[DiagnosticRenderer] rerender ${path.basename(document.uri.fsPath)}`);
        this.clear(document);
        const inspections = await getCachedInspectionsOfDoc(document);
        this.renderInspections(document, inspections);
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
        const range = calculateHintPosition(inspection.problem);
        const severiy = inspection.severity.toUpperCase() === 'HIGH' ? DiagnosticSeverity.Information : DiagnosticSeverity.Hint;
        const diagnostic = new Diagnostic(range, inspection.problem.description, severiy);
        diagnostic.source = JAVA_COPILOT_FEATURE_GROUP;
        //@ts-ignore
        diagnostic.additional = inspection;
        return diagnostic;
    }
}
