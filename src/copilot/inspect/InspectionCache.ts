import { SymbolKind, TextDocument } from 'vscode';
import { METHOD_KINDS, getClassesAndMethodsContainedInRange, getClassesAndMethodsOfDocument, logger } from '../utils';
import { Inspection } from './Inspection';
import * as crypto from "crypto";
import { SymbolNode } from './SymbolNode';

/**
 * A map based cache for inspections of a document.
 * format: `Map<documentKey, Map<symbolQualifiedName, [symbolVersionId, Inspection[]]`
 */
const DOC_SYMBOL_VERSION_INSPECTIONS: Map<string, Map<string, [string, Inspection[]]>> = new Map();

export default class InspectionCache {
    /**
     * check if the document or the symbol is cached.
     * if the symbol is provided, check if the symbol or its contained symbols are cached.
     */
    public static async hasCache(document: TextDocument, symbol?: SymbolNode): Promise<boolean> {
        const documentKey = document.uri.fsPath;
        if (!symbol) {
            return DOC_SYMBOL_VERSION_INSPECTIONS.has(documentKey);
        }
        const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
        // check if the symbol or its contained symbols are cached
        const symbols = await getClassesAndMethodsContainedInRange(symbol.range, document);
        for (const s of symbols) {
            const versionInspections = symbolInspections?.get(s.qualifiedName);
            const symbolVersionId = InspectionCache.calculateSymbolVersionId(document, s);
            if (versionInspections?.[0] === symbolVersionId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get cached inspections of a document, if the document is not cached, return an empty array.
     * Cached inspections of outdated symbols are filtered out.Symbols are considered outdated if 
     * their content has changed.
     */
    public static async getCachedInspectionsOfDoc(document: TextDocument): Promise<Inspection[]> {
        const symbols: SymbolNode[] = await getClassesAndMethodsOfDocument(document);
        const inspections: Inspection[] = [];
        // we don't get cached inspections directly from the cache, because we need to filter out outdated symbols
        for (const symbol of symbols) {
            const cachedInspections = InspectionCache.getCachedInspectionsOfSymbol(document, symbol);
            inspections.push(...cachedInspections);
        }
        return inspections;
    }

    /**
     * @returns the cached inspections, or undefined if not found
     */
    public static getCachedInspectionsOfSymbol(document: TextDocument, symbol: SymbolNode): Inspection[] {
        const documentKey = document.uri.fsPath;
        const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
        const versionInspections = symbolInspections?.get(symbol.qualifiedName);
        const symbolVersionId = InspectionCache.calculateSymbolVersionId(document, symbol);
        if (versionInspections?.[0] === symbolVersionId) {
            logger.debug(`cache hit for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${document.uri.fsPath}`);
            const inspections = versionInspections[1];
            inspections.forEach(s => {
                s.document = document;
                s.problem.position.line = s.problem.position.relativeLine + symbol.range.start.line;
            });
            return inspections;
        }
        logger.debug(`cache miss for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${document.uri.fsPath}`);
        return [];
    }

    public static cache(document: TextDocument, symbols: SymbolNode[], inspections: Inspection[]): void {
        for (const symbol of symbols) {
            const isMethod = METHOD_KINDS.includes(symbol.kind);
            const symbolInspections: Inspection[] = inspections.filter(inspection => {
                const inspectionLine = inspection.problem.position.line;
                return isMethod ?
                    // NOTE: method inspections are inspections whose `position.line` is within the method's range
                    inspectionLine >= symbol.range.start.line && inspectionLine <= symbol.range.end.line :
                    // NOTE: class inspections are inspections whose `position.line` is exactly the first line number of the class
                    inspectionLine === symbol.range.start.line;
            });
            // re-calculate `relativeLine` of method inspections, `relativeLine` is the relative line number to the start of the method
            symbolInspections.forEach(inspection => inspection.problem.position.relativeLine = inspection.problem.position.line - symbol.range.start.line);
            InspectionCache.cacheSymbolInspections(document, symbol, symbolInspections);
        }
    }

    /**
     * invalidate the cache of a document, a symbol, or an inspection.
     * NOTE: the cached inspections of the symbol and its contained symbols will be removed when invalidating a symbol.
     */
    public static invalidateInspectionCache(document?: TextDocument, symbol?: SymbolNode, inspeciton?: Inspection): void {
        if (!document) {
            DOC_SYMBOL_VERSION_INSPECTIONS.clear();
        } else if (!symbol) {
            const documentKey = document.uri.fsPath;
            DOC_SYMBOL_VERSION_INSPECTIONS.delete(documentKey);
        } else if (!inspeciton) {
            const documentKey = document.uri.fsPath;
            const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
            // remove the cached inspections of the symbol
            symbolInspections?.delete(symbol.qualifiedName);
            // remove the cached inspections of contained symbols
            symbolInspections?.forEach((_, key) => {
                if (key.startsWith(symbol.qualifiedName)) {
                    symbolInspections.delete(key);
                }
            });
        } else {
            const documentKey = document.uri.fsPath;
            const symbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey);
            const versionInspections = symbolInspections?.get(symbol.qualifiedName);
            const symbolVersionId = InspectionCache.calculateSymbolVersionId(document, symbol);
            if (versionInspections?.[0] === symbolVersionId) {
                const inspections = versionInspections[1];
                // remove the inspection
                inspections.splice(inspections.indexOf(inspeciton), 1);
            }
        }
    }

    private static cacheSymbolInspections(document: TextDocument, symbol: SymbolNode, inspections: Inspection[]): void {
        logger.debug(`cache ${inspections.length} inspections for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${document.uri.fsPath}`);
        const documentKey = document.uri.fsPath;
        const symbolVersionId = InspectionCache.calculateSymbolVersionId(document, symbol);
        const cachedSymbolInspections = DOC_SYMBOL_VERSION_INSPECTIONS.get(documentKey) ?? new Map();
        inspections.forEach(s => {
            s.document = document;
            s.symbol = symbol;
        });
        // use qualified name to prevent conflicts between symbols with the same signature in same document
        cachedSymbolInspections.set(symbol.qualifiedName, [symbolVersionId, inspections]);
        DOC_SYMBOL_VERSION_INSPECTIONS.set(documentKey, cachedSymbolInspections);
    }

    /**
     * generate a unique id for the symbol based on its content, so that we can detect if the symbol has changed
     */
    private static calculateSymbolVersionId(document: TextDocument, symbol: SymbolNode): string {
        const body = document.getText(symbol.range);
        return crypto.createHash('md5').update(body).digest("hex")
    }
}
