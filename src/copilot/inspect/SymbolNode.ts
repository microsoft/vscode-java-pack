import { DocumentSymbol, SymbolKind, Range } from "vscode";

/**
 * A wrapper class for DocumentSymbol to provide additional functionalities:
 * - parent: the parent symbol
 * - qualifiedName: the fully qualified name of the symbol
 */
export class SymbolNode {
    public constructor(
        public readonly symbol: DocumentSymbol,
        public readonly parent?: SymbolNode
    ) {
    }

    public get range(): Range {
        return this.symbol.range;
    }

    public get kind(): SymbolKind {
        return this.symbol.kind;
    }

    /**
     * The fully qualified name of the symbol.
     */
    public get qualifiedName(): string {
        if (this.parent) {
            return this.parent.qualifiedName + "." + this.symbol.name;
        } else {
            return this.symbol.name;
        }
    }

    public get children(): SymbolNode[] {
        return this.symbol.children.map(symbol => new SymbolNode(symbol, this));
    }
}