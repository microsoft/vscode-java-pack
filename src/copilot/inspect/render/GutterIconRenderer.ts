/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DecorationOptions, ExtensionContext, MarkdownString, TextDocument, TextEditorDecorationType, Uri, window } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger } from "../../../copilot/utils";
import path = require("path");
import { COMMAND_FIX_INSPECTION } from "../commands";
import _ from "lodash";

export class GutterIconRenderer implements InspectionRenderer {
    private readonly gutterIcons: Map<Uri, InspectionGutterIcon[]> = new Map();
    private gutterIconDecorationType: TextEditorDecorationType | undefined;

    public install(context: ExtensionContext): InspectionRenderer {
        if (this.gutterIconDecorationType) return this;
        logger.debug(`[GutterIconRenderer] install`);
        const icon = Uri.file(path.join(context.asAbsolutePath('resources'), `gutter-blue.svg`));
        this.gutterIconDecorationType = window.createTextEditorDecorationType({
            isWholeLine: true,
            gutterIconPath: icon,
            gutterIconSize: 'contain'
        });
        return this;
    }

    public uninstall(): void {
        if (!this.gutterIconDecorationType) return;
        logger.debug(`[GutterIconRenderer] uninstall`);
        this.gutterIcons.clear();
        window.visibleTextEditors.forEach(editor => this.gutterIconDecorationType && editor.setDecorations(this.gutterIconDecorationType, []));
        this.gutterIconDecorationType.dispose();
        this.gutterIconDecorationType = undefined;
    }

    public clear(document?: TextDocument): void {
        if (!this.gutterIconDecorationType) return;
        if (document) {
            this.gutterIcons?.set(document.uri, []);
        } else {
            this.gutterIcons?.clear();
        }
        window.visibleTextEditors.forEach(editor => this.gutterIconDecorationType && editor.setDecorations(this.gutterIconDecorationType, []));
    }

    public renderInspections(document: TextDocument, inspections: Inspection[]): void {
        const editor = window.visibleTextEditors.find(e => e.document.uri === document.uri);
        if (inspections.length < 1 || !editor || !this.gutterIconDecorationType) {
            return;
        }

        const oldItems: readonly InspectionGutterIcon[] = this.gutterIcons.get(document.uri) ?? [];
        const oldIds: string[] = _.uniq(oldItems).map(c => c.inspection.id);
        const newIds: string[] = inspections.map(i => i.id);
        const toKeep: InspectionGutterIcon[] = _.intersection(oldIds, newIds).map(id => oldItems.find(c => c.inspection.id === id)!) ?? [];
        const toAdd: InspectionGutterIcon[] = _.difference(newIds, oldIds).map(id => inspections.find(i => i.id === id)!).map(i => GutterIconRenderer.toGutterIcon(i));
        const newGutterIcons: InspectionGutterIcon[] = [...toKeep, ...toAdd];
        this.gutterIcons.set(document.uri, newGutterIcons);

        editor.setDecorations(this.gutterIconDecorationType, newGutterIcons);
    }

    private static toGutterIcon(inspection: Inspection): InspectionGutterIcon {
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const args = [inspection.problem, inspection.solution, 'guttericons'];
        const commandUri = Uri.parse(`command:${COMMAND_FIX_INSPECTION}?${encodeURIComponent(JSON.stringify(args))}`);
        const hoverMessage = new MarkdownString(`${inspection.problem.description}\n\n$(copilot) [${inspection.solution}](${commandUri})`, true);
        hoverMessage.isTrusted = true;
        return { range, hoverMessage, inspection };
    }
}

interface InspectionGutterIcon extends DecorationOptions {
    inspection: Inspection;
}
