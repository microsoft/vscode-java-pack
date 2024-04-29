import { DocumentSymbol, LogOutputChannel, SymbolKind, TextDocument, commands, window, Range, Selection } from "vscode";

export const CLASS_KINDS: SymbolKind[] = [SymbolKind.Class, SymbolKind.Interface, SymbolKind.Enum];
export const METHOD_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Constructor];

export const logger: LogOutputChannel = window.createOutputChannel("Java Rewriting Suggestions", { log: true });

/**
 * get all the class symbols contained in the `range` in the `document`
 */
export async function getClassesContainedInRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const symbols = await getClassesAndMethodsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        .filter(clazz => range.contains(clazz.range));
}

/**
 * get the innermost class symbol that completely contains the `range` in the `document`
 */
export async function getInnermostClassContainsRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol> {
    const symbols = await getClassesAndMethodsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        // reverse the classes to get the innermost class first
        .reverse().filter(clazz => clazz.range.contains(range))[0];
}

/**
 * get all the method symbols that are completely or partially contained in the `range` in the `document`
 */
export async function getIntersectionMethodsOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const symbols = await getClassesAndMethodsOfDocument(document);
    return symbols.filter(symbol => METHOD_KINDS.includes(symbol.kind))
        .filter(method => method.range.intersection(range));
}

export function getUnionRange(symbols: DocumentSymbol[]): Range {
    let result: Range = new Range(symbols[0].range.start, symbols[0].range.end);
    for (const symbol of symbols) {
        result = result.union(symbol.range);
    }
    return result;
}

/**
 * get all classes (classes inside methods are not considered) and methods of a document in a pre-order traversal manner
 */
async function getClassesAndMethodsOfDocument(document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();

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

export async function getTopLevelClassesOfDocument(document: TextDocument): Promise<DocumentSymbol[]> {
    const symbols = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind));
}

export function uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}
