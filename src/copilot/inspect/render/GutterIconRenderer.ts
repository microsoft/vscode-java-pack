/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DecorationOptions, ExtensionContext, MarkdownString, TextDocument, TextEditorDecorationType, Uri, window } from "vscode";
import { Inspection, InspectionRenderer } from "..";
import { COMMAND_FIX } from "../../../copilot/commands";
import { output } from "../../output";
import { getCachedInspectionsOfDoc } from "../cache";
import { calculateHintPosition } from "../utils";
import path = require("path");

export class GutterIconRenderer implements InspectionRenderer {
    private readonly gutterIcons: Map<Uri, GutterIcon[]> = new Map();
    private gutterIconDecorationType: TextEditorDecorationType | undefined;

    public install(context: ExtensionContext): void {
        if (this.gutterIconDecorationType) return;
        output.log(`[GutterIconRenderer] install`);
        const icon = Uri.file(path.join(context.asAbsolutePath('resources'), `gutter-blue.svg`));
        this.gutterIconDecorationType = window.createTextEditorDecorationType({
            isWholeLine: true,
            gutterIconPath: icon,
            gutterIconSize: 'contain'
        });
    }

    public uninstall(): void {
        if (!this.gutterIconDecorationType) return;
        output.log(`[GutterIconRenderer] uninstall`);
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

    public async rerender(document: TextDocument): Promise<void> {
        output.log(`[GutterIconRenderer] rerender ${path.basename(document.uri.fsPath)}`);
        this.clear(document);
        const inspections = await getCachedInspectionsOfDoc(document);
        this.renderInspections(document, inspections);
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
        const range = calculateHintPosition(inspection.problem);
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
