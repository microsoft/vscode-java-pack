import { DocumentSymbol, LogOutputChannel, SymbolKind, TextDocument, commands, window, Range, Selection } from "vscode";

export const CLASS_KINDS: SymbolKind[] = [SymbolKind.Class, SymbolKind.Interface, SymbolKind.Enum];
export const METHOD_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Constructor];

export const logger: LogOutputChannel = window.createOutputChannel("Java Rewriting Suggestions", { log: true });

export async function getContainedClassesOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const classes = getClassesAndMethodsOfSymbols(stack).filter(symbol => CLASS_KINDS.includes(symbol.kind));
    return classes.filter(clazz => range.contains(clazz.range));
}

export async function getIntersectionMethodsOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const methods = getClassesAndMethodsOfSymbols(stack).filter(symbol => METHOD_KINDS.includes(symbol.kind));
    return methods.filter(method => method.range.intersection(range));
}

export async function getContainingClassOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const classes = getClassesAndMethodsOfSymbols(stack).filter(symbol => CLASS_KINDS.includes(symbol.kind));
    // reverse the classes to get the innermost class first
    return classes.reverse().filter(clazz => clazz.range.contains(range))[0];
}

export function getUnionRange(symbols: DocumentSymbol[]): Range {
    let result: Range = new Range(symbols[0].range.start, symbols[0].range.end);
    for (const method of symbols) {
        result = result.union(method.range);
    }
    return result;
}

function getClassesAndMethodsOfSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {
    const stack = symbols;

    const result: DocumentSymbol[] = [];
    while (stack.length > 0) {
        const symbol = stack.pop() as DocumentSymbol;
        if (CLASS_KINDS.includes(symbol.kind)) {
            result.push(symbol);
            stack.push(...symbol.children.reverse());
        } else if (METHOD_KINDS.includes(symbol.kind)) {
            result.push(symbol);
        }
    }
    return result;
}
