/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ExtensionContext, TextDocument, WorkspaceConfiguration, workspace } from "vscode";
import { CodeLensRenderer } from "./render/CodeLensRenderer";
import { DiagnosticRenderer } from "./render/DiagnosticRenderer";
import { GutterIconRenderer } from "./render/GutterIconRenderer";
import { RulerHighlightRenderer } from "./render/RulerHighlightRenderer";
import { InspectionRenderer } from "./render/InspectionRenderer";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { isCodeLensDisabled, logger } from "../utils";
import { InspectActionCodeLensProvider } from "./InspectActionCodeLensProvider";
import { debounce } from "lodash";
import InspectionCache from "./InspectionCache";

/**
 * `DocumentRenderer` is responsible for 
 * - managing `Rewrite with new syntax` code lenses renderer
 * - managing inspection renderers based on settings
 * - rendering inspections for a document
 */
export class DocumentRenderer {
    private readonly availableRenderers: { [type: string]: InspectionRenderer } = {};
    private readonly installedRenderers: InspectionRenderer[] = [];
    private readonly inspectActionCodeLensProvider: InspectActionCodeLensProvider;
    private readonly rerenderDebouncelyMap: { [key: string]: (document: TextDocument) => void } = {};

    public constructor() {
        this.inspectActionCodeLensProvider = new InspectActionCodeLensProvider();
        this.availableRenderers['diagnostics'] = new DiagnosticRenderer();
        this.availableRenderers['guttericons'] = new GutterIconRenderer();
        this.availableRenderers['codelenses'] = new CodeLensRenderer();
        this.availableRenderers['rulerhighlights'] = new RulerHighlightRenderer();
    }

    public install(context: ExtensionContext): DocumentRenderer {
        if (this.installedRenderers.length > 0) {
            logger.warn('DefaultRenderer is already installed');
            return this;
        }
        this.inspectActionCodeLensProvider.install(context);
        // watch for inspection renderers configuration changes
        workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('java.copilot.inspection.renderer')) {
                const settings = this.reloadInspectionRenderers(context);
                sendInfo('java.copilot.inspection.renderer.changed', { 'settings': `${settings.join(',')}` });
            }
        });
        this.reloadInspectionRenderers(context);
        return this;
    }

    /**
     * rerender all inspections for the given document
     * @param document the document to rerender
     * @param debounced whether to rerender debouncely
     */
    public async rerender(document: TextDocument, debounced: boolean = false): Promise<void> {
        if (document.languageId !== 'java') return;
        if (!debounced) {
            this.inspectActionCodeLensProvider.rerender(document);
            this.rerenderInspections(document);
            return;
        }
        // clear all rendered inspections first
        this.installedRenderers.forEach(r => r.clear(document));
        const key = document.uri.fsPath;
        if (!this.rerenderDebouncelyMap[key]) {
            this.rerenderDebouncelyMap[key] = debounce((document: TextDocument) => {
                this.inspectActionCodeLensProvider.rerender(document);
                this.rerenderInspections(document);
            });
        }
        this.rerenderDebouncelyMap[key](document);
    }

    private async rerenderInspections(document: TextDocument): Promise<void> {
        const inspections = await InspectionCache.getCachedInspectionsOfDoc(document);
        this.installedRenderers.forEach(r => r.clear(document));
        this.installedRenderers.forEach(r => {
            r.renderInspections(document, inspections);
        });
    }

    private reloadInspectionRenderers(context: ExtensionContext): string[] {
        this.installedRenderers.splice(0, this.installedRenderers.length);
        const settings = this.reloadInspectionRendererSettings();
        Object.entries(this.availableRenderers).forEach(([type, renderer]) => {
            if (settings.includes(type.toLowerCase())) { // if enabled
                this.installedRenderers.push(renderer);
                renderer.install(context);
            } else {
                renderer.uninstall();
            }
        });
        return settings;
    }

    /**
     * get the enabled inspection renderer names
     */
    private reloadInspectionRendererSettings(): string[] {
        const config: WorkspaceConfiguration = workspace.getConfiguration('java.copilot.inspection.renderer');
        const types: string[] = Object.keys(this.availableRenderers);
        const settings = types.map(type => config.get<boolean>(type) ? type.toLowerCase() : '').filter(t => t);
        if (settings.length === 0) {
            settings.push('diagnostics');
            settings.push('rulerhighlights');
            settings.push(isCodeLensDisabled() ? 'guttericons' : 'codelenses');
        }
        return settings;
    }
}
