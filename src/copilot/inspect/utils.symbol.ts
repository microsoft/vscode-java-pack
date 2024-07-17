import { SymbolKind, TextDocument, Range, DocumentSymbol, commands } from "vscode";
import { SymbolNode } from "./SymbolNode";
import path from "path";
import { logger } from "../logger";

export const CLASS_KINDS: SymbolKind[] = [SymbolKind.Class, SymbolKind.Enum];
export const METHOD_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Constructor];
export const FIELD_KINDS: SymbolKind[] = [SymbolKind.Field, SymbolKind.Property, SymbolKind.Constant];

/**
 * get all the class symbols contained in the `range` in the `document`
 */
export async function getClassesContainedInRange(range: Range, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        .filter(clazz => range.contains(clazz.range));
}

export async function getSymbolsContainedInRange(range: Range, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => range.contains(symbol.range));
}

/**
 * get the innermost class symbol that completely contains the `range` in the `document`
 */
export async function getInnermostClassContainsRange(range: Range, document: TextDocument): Promise<SymbolNode | undefined> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        // reverse the classes to get the innermost class first
        .reverse().filter(clazz => clazz.range.contains(range))[0];
}

/**
 * get all the method/field symbols that are completely or partially contained in the `range` in the `document`
 */
export async function getIntersectionSymbolsOfRange(range: Range, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => METHOD_KINDS.includes(symbol.kind) || FIELD_KINDS.includes(symbol.kind))
        .filter(method => method.range.intersection(range));
}

export function getUnionRange(symbols: SymbolNode[]): Range {
    if (symbols.length === 0) {
        throw new Error("No symbols provided");
    }
    let result: Range = new Range(symbols[0].range.start, symbols[0].range.end);
    for (const symbol of symbols) {
        result = result.union(symbol.range);
    }
    return result;
}

/**
 * get all classes (classes inside methods are not considered) and methods of a document in a pre-order traversal manner
 */
export async function getSymbolsOfDocument(document: TextDocument): Promise<SymbolNode[]> {
    const stack = (await getDocumentSymbols(document)).reverse().map(symbol => new SymbolNode(document, symbol));

    const result: SymbolNode[] = [];
    while (stack.length > 0) {
        const symbol = stack.pop() as SymbolNode;
        if (CLASS_KINDS.includes(symbol.kind)) {
            result.push(symbol);
            stack.push(...symbol.children.reverse());
        } else if (METHOD_KINDS.includes(symbol.kind) || FIELD_KINDS.includes(symbol.kind)) {
            result.push(symbol);
        }
    }
    return result;
}

export async function getTopLevelClassesOfDocument(document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getDocumentSymbols(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind)).map(symbol => new SymbolNode(document, symbol));
}

export async function getDocumentSymbols(document: TextDocument): Promise<DocumentSymbol[]> {
    logger.debug(`Getting document symbols of ${path.basename(document.fileName)}`);
    const symbols = (await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? [];
    logger.debug(`Got ${symbols.length} document symbols of ${path.basename(document.fileName)}`);
    return symbols;
}