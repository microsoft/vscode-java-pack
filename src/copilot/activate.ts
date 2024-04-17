import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeLens, CodeLensProvider, Event, EventEmitter, ExtensionContext, Range, Selection, TextDocument, Uri, languages, window, workspace } from "vscode";
import { COMMAND_INSPECT_CLASS, COMMAND_INSPECT_RANGE, registerCommands } from "./commands";
import { InspectionRenderer } from "./inspect";
import { DefaultRenderer } from "./inspect/render/DefaultRenderer";
import { fixDiagnostic } from "./inspect/render/DiagnosticRenderer";
import { debounce, getFirstLevelClassesOfDoc, logger, waitUntilExtensionsActivated } from "./inspect/utils";

export const DEPENDENT_EXTENSIONS = ['github.copilot-chat', 'redhat.java'];

export async function activateJavaCopilot(context: ExtensionContext): Promise<void> {
    logger.info('Waiting for dependent extensions to be ready...');
    await waitUntilExtensionsActivated(DEPENDENT_EXTENSIONS);
    logger.info('Activating Java Copilot features...');
    doActivate(context);
}

export function doActivate(context: ExtensionContext): void {
    const renderer: InspectionRenderer = new DefaultRenderer(context);

    // Commands
    registerCommands(renderer);

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
        languages.registerCodeActionsProvider({ language: 'java' }, { provideCodeActions: fixDiagnostic }), // Fix using Copilot
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
        logger.debug('[InspectCodeLensProvider] install...');
        context.subscriptions.push(
            languages.registerCodeLensProvider({ language: 'java' }, this)
        );
        return this;
    }

    async rerender(document: TextDocument) {
        logger.debug('[InspectCodeLensProvider] rerender inspect codelenses...');
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
