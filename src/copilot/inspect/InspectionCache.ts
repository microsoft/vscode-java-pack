import { SymbolKind, TextDocument } from 'vscode';
import { getSymbolsContainedInRange, getSymbolsOfDocument, logger } from '../utils';
import { Inspection } from './Inspection';
import { SymbolNode } from './SymbolNode';
import path from 'path';

/**
 * A map based cache for inspections of a document.
 * format: `Map<documentKey, Map<symbolQualifiedName, [symbolSnapshotId, Inspection[]]`
 */
const DOC_SYMBOL_SNAPSHOT_INSPECTIONS: Map<string, Map<string, [string, Inspection[]]>> = new Map();

export default class InspectionCache {
    /**
     * check if the document or the symbol is cached.
     * if the symbol is provided, check if the symbol or its contained symbols are cached.
     */
    public static async hasCache(document: TextDocument, symbol?: SymbolNode): Promise<boolean> {
        const inspections = await InspectionCache.getValidInspections(document, symbol, true);
        return inspections.filter(insp => !insp.ignored).length > 0;
    }

    /**
     * invalidate the cache of a document, a symbol, or an inspection.
     * NOTE: the cached inspections of the symbol and its contained symbols will be removed when invalidating a symbol.
     */
    public static async ignoreInspections(document: TextDocument, symbol?: SymbolNode, inspection?: Inspection): Promise<void> {
        if (!inspection) {
            const inspections = await this.getValidInspections(document, symbol, true);
            inspections.forEach(insp => insp.ignored = true);
        } else {
            inspection.ignored = true;
        }
    }

    /**
     * Get cached valid inspections. Inspection is invalid iff its symbol is modified.
     */
    public static async getValidInspections(document: TextDocument, symbol?: SymbolNode, includeContainedSymbols: boolean = false): Promise<Inspection[]> {
        if (!symbol) {
            // we don't get cached inspections directly from the cache, because we need to filter out invalid inspections
            const symbols: SymbolNode[] = await getSymbolsOfDocument(document);
            return (await Promise.all(symbols.map(symbol => InspectionCache.getValidInspections(document, symbol)))).flat();
        } else if (symbol && includeContainedSymbols) {
            // get valid inspections of the symbol and its contained symbols
            const symbols = await getSymbolsContainedInRange(symbol.range, document);
            return (await Promise.all(symbols.map(symbol => InspectionCache.getValidInspections(document, symbol)))).flat();
        } else {
            const documentKey = document.uri.fsPath;
            const symbolInspections = DOC_SYMBOL_SNAPSHOT_INSPECTIONS.get(documentKey);
            const snapshotInspections = symbolInspections?.get(symbol.qualifiedName);
            if (snapshotInspections?.[0] === symbol.snapshotId) { // check if valid
                logger.trace(`cache hit for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${path.basename(document.uri.fsPath)}`);
                const inspections = snapshotInspections[1];
                inspections.forEach(s => {
                    s.symbol = symbol; // set to the latest symbol instance
                    s.problem.position.startLine = s.problem.position.relativeStartLine + symbol.range.start.line;
                    s.problem.position.endLine = s.problem.position.relativeEndLine + symbol.range.start.line;
                });
                return inspections;
            }
            logger.trace(`cache miss for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${path.basename(document.uri.fsPath)}`);
            return [];
        }
    }

    /**
     * invalidate the cache of a document, a symbol, or an inspection.
     * NOTE: the cached inspections of the symbol and its contained symbols will be removed when invalidating a symbol.
     */
    public static clearInspections(document?: TextDocument, symbol?: SymbolNode, inspeciton?: Inspection): void {
        if (!document) {
            DOC_SYMBOL_SNAPSHOT_INSPECTIONS.clear();
        } else if (!symbol) {
            const documentKey = document.uri.fsPath;
            DOC_SYMBOL_SNAPSHOT_INSPECTIONS.delete(documentKey);
        } else if (!inspeciton) {
            const documentKey = document.uri.fsPath;
            const symbolInspections = DOC_SYMBOL_SNAPSHOT_INSPECTIONS.get(documentKey);
            // remove the cached inspections of contained symbols
            symbolInspections?.forEach((_, key) => {
                if (key.startsWith(symbol.qualifiedName)) {
                    symbolInspections.delete(key);
                }
            });
        } else {
            const documentKey = document.uri.fsPath;
            const symbolInspections = DOC_SYMBOL_SNAPSHOT_INSPECTIONS.get(documentKey);
            const snapshotInspections = symbolInspections?.get(symbol.qualifiedName);
            if (snapshotInspections?.[0] === symbol.snapshotId) {
                const inspections = snapshotInspections[1];
                // remove the inspection
                inspections.splice(inspections.indexOf(inspeciton), 1);
            }
        }
    }

    public static cacheInspections(document: TextDocument, symbol: SymbolNode, inspections: Inspection[], append: boolean = false): void {
        logger.debug(`cache ${inspections.length} inspections for ${SymbolKind[symbol.kind]} ${symbol.qualifiedName} of ${path.basename(document.uri.fsPath)}`);
        const documentKey = document.uri.fsPath;
        const cachedSymbolInspections = DOC_SYMBOL_SNAPSHOT_INSPECTIONS.get(documentKey) ?? new Map();
        if (append) {
            const symbolInspections = cachedSymbolInspections.get(symbol.qualifiedName);
            if (symbolInspections?.[0] === symbol.snapshotId) {
                symbolInspections[1].push(...inspections);
            } else {
                cachedSymbolInspections.set(symbol.qualifiedName, [symbol.snapshotId, inspections]);
            }
        } else {
            cachedSymbolInspections.set(symbol.qualifiedName, [symbol.snapshotId, inspections]);
        }
        DOC_SYMBOL_SNAPSHOT_INSPECTIONS.set(documentKey, cachedSymbolInspections);
    }
}
