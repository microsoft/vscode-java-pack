/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DecorationOptions, ExtensionContext, MarkdownString, TextDocument, TextEditorDecorationType, Uri, window } from "vscode";
import { Inspection } from "../Inspection";
import { InspectionRenderer } from "./InspectionRenderer";
import { logger } from "../../../copilot/utils";
import path = require("path");
import { COMMAND_FIX } from "../commands";

export class GutterIconRenderer implements InspectionRenderer {
    private readonly gutterIcons: Map<Uri, GutterIcon[]> = new Map();
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
        const newGutterIcons: GutterIcon[] = inspections.map(s => GutterIconRenderer.toGutterIcon(s));
        const newGutterIconsMessages = newGutterIcons.map(d => d.inspection.solution.trim());
        const existingGutterIcons = this.gutterIcons.get(document.uri) ?? [];
        const leftGutterIcons = existingGutterIcons.filter(d => !newGutterIconsMessages.includes(d.inspection.solution.trim()));
        newGutterIcons.push(...leftGutterIcons);
        this.gutterIcons.set(document.uri, newGutterIcons);

        editor.setDecorations(this.gutterIconDecorationType, newGutterIcons);
    }

    private static toGutterIcon(inspection: Inspection): GutterIcon {
        const range = Inspection.getIndicatorRangeOfInspection(inspection.problem);
        const args = [inspection.problem, inspection.solution, 'guttericons'];
        const commandUri = Uri.parse(`command:${COMMAND_FIX}?${encodeURIComponent(JSON.stringify(args))}`);
        const hoverMessage = new MarkdownString(`${inspection.problem.description}\n\n$(copilot) [${inspection.solution}](${commandUri})`, true);
        hoverMessage.isTrusted = true;
        return { range, hoverMessage, inspection };
    }
}

interface GutterIcon extends DecorationOptions {
    inspection: Inspection;
}
