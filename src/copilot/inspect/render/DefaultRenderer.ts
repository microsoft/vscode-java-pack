/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ExtensionContext, TextDocument } from "vscode";
import { CodeLensRenderer } from "./CodeLensRenderer";
import { DiagnosticRenderer } from "./DiagnosticRenderer";
import { GutterIconRenderer } from "./GutterIconRenderer";
import { RulerHighlightRenderer } from "./RulerHighlightRenderer";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";

export class DefaultRenderer implements InspectionRenderer {
    private readonly renderers: { [type: string]: InspectionRenderer } = {};
    private readonly installedRenderers: InspectionRenderer[] = [];

    public constructor() {
        this.renderers['diagnostics'] = new DiagnosticRenderer();
        this.renderers['guttericons'] = new GutterIconRenderer();
        this.renderers['codelenses'] = new CodeLensRenderer();
        this.renderers['rulerhighlights'] = new RulerHighlightRenderer();
        this.installedRenderers = Object.values(this.renderers);
    }

    public install(context: ExtensionContext): InspectionRenderer {
        this.installedRenderers.forEach(r => r.install(context));
        return this;
    }

    public uninstall(): void {
        this.installedRenderers.forEach(r => r.uninstall());
    }

    public clear(document?: TextDocument): void {
        this.installedRenderers.forEach(r => r.clear(document));
    }

    public renderInspections(document: TextDocument, inspections: Inspection[]): void {
        this.installedRenderers.forEach(r => r.renderInspections(document, inspections));
    }
}
