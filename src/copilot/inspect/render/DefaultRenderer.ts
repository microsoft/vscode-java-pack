/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ExtensionContext, TextDocument, WorkspaceConfiguration, workspace } from "vscode";
import { CodeLensRenderer } from "./CodeLensRenderer";
import { DiagnosticRenderer } from "./DiagnosticRenderer";
import { GutterIconRenderer } from "./GutterIconRenderer";
import { RulerHighlightRenderer } from "./RulerHighlightRenderer";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { isCodeLensDisabled, logger } from "../../../copilot/utils";

export class DefaultRenderer implements InspectionRenderer {
    private readonly renderers: { [type: string]: InspectionRenderer } = {};
    private readonly installedRenderers: InspectionRenderer[] = [];

    public constructor() {
        this.renderers['diagnostics'] = new DiagnosticRenderer();
        this.renderers['guttericons'] = new GutterIconRenderer();
        this.renderers['codelenses'] = new CodeLensRenderer();
        this.renderers['rulerhighlights'] = new RulerHighlightRenderer();
    }

    public install(context: ExtensionContext): InspectionRenderer {
        if (this.installedRenderers.length > 0) {
            logger.warn('DefaultRenderer is already installed');
            return this;
        }
        workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('java.copilot.inspection.renderer')) {
                const settings = this.reloadRenderers(context);
                sendInfo('java.copilot.inspection.renderer.changed', { 'settings': `${settings.join(',')}` });
            }
        });
        this.reloadRenderers(context);
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

    private reloadRenderers(context: ExtensionContext): string[] {
        this.installedRenderers.splice(0, this.installedRenderers.length);
        const settings = this.reloadSettings();
        Object.entries(this.renderers).forEach(([type, renderer]) => {
            if (settings.includes(type.toLowerCase())) {
                this.installedRenderers.push(renderer);
                renderer.install(context);
            } else {
                renderer.uninstall();
            }
        });
        return settings;
    }

    private reloadSettings(): string[] {
        const config: WorkspaceConfiguration = workspace.getConfiguration('java.copilot.inspection.renderer');
        const types: string[] = Object.keys(this.renderers);
        const settings = types.map(type => config.get<boolean>(type) ? type.toLowerCase() : '').filter(t => t);
        if (settings.length === 0) {
            settings.push('diagnostics');
            settings.push('rulerhighlights');
            settings.push(isCodeLensDisabled() ? 'guttericons' : 'codelenses');
        }
        return settings;
    }
}
