import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeLens, CodeLensProvider, DocumentSymbol, Event, EventEmitter, ExtensionContext, Range, Selection, TextDocument, Uri, commands, languages, window, workspace } from "vscode";
import { COMMAND_FIX, COMMAND_HIGHLIGHT, COMMAND_INSPECT_CLASS, COMMAND_INSPECT_RANGE, Inspection, InspectionRenderer, inspectClass, inspectRange } from ".";
import { output } from "../output";
import { fixUsingCopilot } from "./fix";
import { DefaultRenderer } from "./render/DefaultRenderer";
import { calculateHintPosition, debounce, getFirstLevelClassesOfDoc, uncapitalize } from "./utils";

export function activateJavaCopilot(context: ExtensionContext): void {
    const renderer: InspectionRenderer = new DefaultRenderer(context);

    // Commands
    commands.registerCommand(COMMAND_INSPECT_RANGE, async (document: TextDocument, range: Range | Selection) => {
        void inspectRange(document, range).then(inspections => renderer.renderInspections(document, inspections));
    });
    commands.registerCommand(COMMAND_INSPECT_CLASS, async (document: TextDocument, clazz: DocumentSymbol) => {
        void inspectClass(document, clazz).then(inspections => renderer.renderInspections(document, inspections));
    });
    commands.registerCommand(COMMAND_FIX, async (problem: Inspection['problem'], solution: string) => {
        const range = calculateHintPosition(problem);
        void commands.executeCommand('vscode.editorChat.start', {
            autoSend: true,
            message: `/fix ${problem.description}, maybe ${uncapitalize(solution)}`,
            position: range.start,
            initialSelection: new Selection(range.start, range.end),
            initialRange: range
        });
    });
    commands.registerCommand(COMMAND_HIGHLIGHT, async (inspection: Inspection) => {
        inspection.document && void workspace.openTextDocument(inspection.document.uri).then(document => {
            void window.showTextDocument(document).then(editor => {
                const range = document.lineAt(inspection.problem.position.line).range;
                editor.selection = new Selection(range.start, range.end);
                editor.revealRange(range);
            });
        });
    });

    const inspectCodeLensesProvider = new InspectCodeLensProvider().install(context);
    const rerenderDocumentDebouncelyMap: { [key: string]: (document: TextDocument) => void } = {};
    const rerenderDocument = (document?: TextDocument, debounced: boolean = false) => {
        if (document?.languageId !== 'java') return;
        if (!debounced) {
            void inspectCodeLensesProvider.rerender(document);
            renderer.rerender(document);
            return;
        }
        renderer.clear(document);
        const key = document.uri.fsPath;
        if (!rerenderDocumentDebouncelyMap[key]) {
            rerenderDocumentDebouncelyMap[key] = debounce((document: TextDocument) => {
                void inspectCodeLensesProvider.rerender(document);
                renderer.rerender(document);
            });
        }
        rerenderDocumentDebouncelyMap[key](document);
    };

    context.subscriptions.push(
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: fixUsingCopilot }), // Fix using Copilot
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: inspectUsingCopilot }), // Inspect using Copilot
        workspace.onDidOpenTextDocument(doc => rerenderDocument(doc)), // Rerender class codelens and cached suggestions on document open
        workspace.onDidChangeTextDocument(e => rerenderDocument(e.document, true)), // Rerender class codelens and cached suggestions on document change
        window.onDidChangeVisibleTextEditors(editors => editors.forEach(editor => rerenderDocument(editor.document))) // rerender in case of renderers changed.
    );
    window.visibleTextEditors.forEach(editor => rerenderDocument(editor.document)); 
}

async function inspectUsingCopilot(document: TextDocument, range: Range | Selection, _context: CodeActionContext, _token: CancellationToken): Promise<CodeAction[]> {
    const action: CodeAction = {
        title: "Rewrite with new syntax",
        kind: CodeActionKind.RefactorRewrite,
        command: {
            title: "Rewrite selected code using Copilot",
            command: COMMAND_INSPECT_RANGE,
            arguments: [document, range]
        }
    };
    return [action];
}

class InspectCodeLensProvider implements CodeLensProvider {
    private inspectCodeLenses: Map<Uri, CodeLens[]> = new Map();
    private emitter: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.emitter.event;

    install(context: ExtensionContext): InspectCodeLensProvider {
        output.log('[InspectCodeLensProvider] install...');
        context.subscriptions.push(
            languages.registerCodeLensProvider({ language: 'java' }, this)
        );
        return this;
    }

    async rerender(document: TextDocument) {
        output.log('[InspectCodeLensProvider] rerender inspect codelenses...');
        if (document.languageId !== 'java') return;
        const docCodeLenses: CodeLens[] = [];
        const classes = await getFirstLevelClassesOfDoc(document);
        classes.forEach(clazz => docCodeLenses.push(new CodeLens(clazz.range, {
            title: "Rewrite with new syntax",
            command: COMMAND_INSPECT_CLASS,
            arguments: [document, clazz]
        })));
        this.inspectCodeLenses.set(document.uri, docCodeLenses);
        this.refresh();
    }

    provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.inspectCodeLenses.get(document.uri) ?? [];
    }

    refresh(): void {
        this.emitter.fire();
    }
}
