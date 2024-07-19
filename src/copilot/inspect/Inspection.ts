import { TextDocument, workspace, window, Selection, Range, Position } from "vscode";
import { SymbolNode } from "./SymbolNode";

export interface InspectionProblem {
    /**
     * short description of the problem
     */
    description: string;
    position: {
        /**
         * real line number to the start of the document, will change
         */
        startLine: number;
        endLine: number;
        /**
         * relative line number to the start of the symbol(method/class), won't change
         */
        relativeStartLine: number;
        relativeEndLine: number;
    };
    code: string;
}

export interface Inspection {
    id: string;
    document?: TextDocument;
    symbol?: SymbolNode;
    problem: InspectionProblem;
    solution: string;
    severity?: string;
    ignored?: boolean;
}

export namespace Inspection {
    export function revealFirstLineOfInspection(inspection: Inspection) {
        inspection.document && void workspace.openTextDocument(inspection.document.uri).then(document => {
            void window.showTextDocument(document).then(editor => {
                const range = getCodeBlockRangeOfInspection(inspection);
                editor.selection = new Selection(range.start, range.end);
                editor.revealRange(range);
            });
        });
    }

    /**
     * get the range of the rewritable code of the inspection.
     */
    export function getCodeBlockRangeOfInspection(inspection: Inspection): Range {
        const startLine = inspection.problem.position.startLine;
        const endLine = inspection.problem.position.endLine;
        const startLineText = inspection.document?.lineAt(inspection.problem.position.startLine).text;
        const endLineText = inspection.document?.lineAt(inspection.problem.position.endLine).text;
        // get index of first non-empty character
        const startLineStartColumn: number = startLineText?.search(/\S/) ?? 0; // index of first non-empty character

        // get index of last non-empty character
        const matchOfLastLineLastChar = endLineText?.match(/\S(?=\s*$)/);
        const endLineEndColumn: number = matchOfLastLineLastChar?.index ?? 0; // index of last non-empty character

        return new Range(new Position(startLine, startLineStartColumn), new Position(endLine, endLineEndColumn + 1));
    }
}