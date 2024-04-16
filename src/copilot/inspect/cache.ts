import { DocumentSymbol, TextDocument } from 'vscode';
import { Inspection } from ".";
import { CLASS_KINDS, METHOD_KINDS, calculateSymbolVersionId, getClassesAndMethodsOfDoc } from './utils';

// Map<documentKey, Map<symbolName, [symbolId, Promise<Inspection[]>]
const DOC_SYMBOL_VERSION_INSPECTIONS: Map<string, Map<string, [string, Promise<Inspection[]>]>> = new Map();
// Map<documentKey, [documentVersion, Promise<RefactorInspection[]>>>
// const DOC_VERSION_INSPECTIONS: Map<string, [number, Promise<Inspection[]>]> = new Map();

export function hasCache(document: TextDocument, symbol?: DocumentSymbol): boolean {
    const documentKey = document.uri.fsPath;
    if (!symbol) {
        return DOC_SYMBOL_VERSION_INSPECTIONS.has(documentKey);
    }
    const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
    const versionInspections = symbolInspections?.get(symbol.name);
    const symbolId = calculateSymbolVersionId(document, symbol);
    return versionInspections?.[0] === symbolId;
}

export async function getCachedInspectionsOfDoc(document: TextDocument): Promise<Inspection[]> {
    const symbols: DocumentSymbol[] = await getClassesAndMethodsOfDoc(document);
    const inspections: Inspection[] = [];
    for (const symbol of symbols) {
        const cachedInspections = await getCachedInspectionsOfSymbol(document, symbol);
        if (cachedInspections === undefined) continue;
        inspections.push(...cachedInspections);
    }
    return inspections;
}

/**
 * @returns the cached inspections, or undefined if not found
 */
export function getCachedInspectionsOfSymbol(document: TextDocument, symbol: DocumentSymbol): Promise<Inspection[]> | undefined {
    const documentKey = document.uri.fsPath;
    const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
    const versionInspections = symbolInspections?.get(symbol.name);
    const symbolVersionId = calculateSymbolVersionId(document, symbol);
    if (versionInspections?.[0] === symbolVersionId) {
        return versionInspections[1].then(inspections => {
            inspections.forEach(s => {
                s.document = document;
                s.problem.position.line = s.problem.position.relativeLine + symbol.range.start.line;
            });
            return inspections;
        });
    }
    return undefined;
}

function cache(document: TextDocument, symbol: DocumentSymbol, inspections: Inspection[]): void {
    const documentKey = document.uri.fsPath;
    const symbolVersionId = calculateSymbolVersionId(document, symbol);
    const cachedSymbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey) ?? new Map();
    cachedSymbolInspections.set(symbol.name, [symbolVersionId, Promise.resolve(inspections)]);
    DOC_SYMBOL_VERSION_INSPECTIONS.set(documentKey, cachedSymbolInspections);
}

/**
 * @param allInspections inspections having `position.line` as the real line number
 */
function cacheMethodInspections(allInspections: Inspection[], methods: DocumentSymbol[], document: TextDocument): void {
    for (const method of methods) {
        const methodInspections: Inspection[] = allInspections.filter(inspection => {
            const inspectionRange = inspection.problem.position;
            return inspectionRange.line >= method.range.start.line && inspectionRange.line <= method.range.end.line;
        });
        if (methodInspections.length < 1) continue;
        // re-calculate `relativeLine`, `relativeLine` is the relative line number to the method
        methodInspections.forEach(inspection => inspection.problem.position.relativeLine = inspection.problem.position.line - method.range.start.line);
        cache(document, method, methodInspections);
    }
}

/**
 * @param allInspections inspections having `position.line` as the real line number
 */
function cacheClassInspections(allInspections: Inspection[], classes: DocumentSymbol[], document: TextDocument): void {
    for (const clazz of classes) {
        const classInspections: Inspection[] = allInspections.filter(inspection => {
            return inspection.problem.position.line === clazz.range.start.line;
        });
        if (classInspections.length < 1) continue;
        // re-calculate `relativeLine`, `relativeLine` is the relative line number to the method
        classInspections.forEach(inspection => inspection.problem.position.relativeLine = inspection.problem.position.line - clazz.range.start.line);
        cache(document, clazz, classInspections);
    }
}

/**
 * @param allInspections inspections having `position.line` as the real line number
 */
export function cacheClassAndMethodInspections(allInspections: Inspection[], symbols: DocumentSymbol[], document: TextDocument): void {
    if (allInspections.length < 1) return;
    const methods = symbols.filter(symbol => METHOD_KINDS.includes(symbol.kind));
    cacheMethodInspections(allInspections, methods, document);
    const classes = symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind));
    cacheClassInspections(allInspections, classes, document);
}
