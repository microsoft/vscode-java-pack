import { DocumentSymbol, SymbolKind, Range, TextDocument } from "vscode";
import * as crypto from "crypto";

/**
 * A wrapper class for DocumentSymbol to provide additional functionalities:
 * - parent: the parent symbol
 * - qualifiedName: the fully qualified name of the symbol
 */
export class SymbolNode {
    public readonly snapshotId: string;

    public constructor(
        public readonly document: TextDocument,
        public readonly symbol: DocumentSymbol,
        public readonly parent?: SymbolNode
    ) {
        // calculate the snapshot id of the symbol immediately because the symbol content may change.
        this.snapshotId = SymbolNode.calculateSymbolSnapshotId(document, symbol);
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
        return this.symbol.children.map(symbol => new SymbolNode(this.document, symbol, this));
    }

    /**
     * generate a unique id for the symbol based on its content, so that we can detect if the symbol has changed
     */
    private static calculateSymbolSnapshotId(document: TextDocument, symbol: DocumentSymbol): string {
        const body = document.getText(symbol.range);
        return crypto.createHash('md5').update(body).digest("hex")
    }

    public toString(): string {
        return `${SymbolKind[this.kind].toLowerCase()} ${this.symbol.name}`;
    }
}