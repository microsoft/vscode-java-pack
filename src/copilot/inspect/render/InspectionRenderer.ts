import { ExtensionContext, TextDocument } from "vscode";
import { Inspection } from "../Inspection";

export interface InspectionRenderer {
    install(context: ExtensionContext): InspectionRenderer;
    uninstall(): void;
    clear(document?: TextDocument): void;
    renderInspections(document: TextDocument, inspections: Inspection[]): void;
}