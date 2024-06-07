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
        /**
         * code of the first line of the problematic code block
         */
        code: string;
    };
    code: string;
    /**
     * indicator of the problematic code block, e.g. method name/class name, keywork, etc.
     */
    identity: string;
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
                const range = getIndicatorRangeOfInspection(inspection.problem);
                editor.selection = new Selection(range.start, range.end);
                editor.revealRange(range);
            });
        });
    }

    /**
     * get the range of the indicator of the inspection.
     * `indicator` will be used as the position of code lens/diagnostics and also used as initial selection for fix commands.
     */
    export function getIndicatorRangeOfInspection(problem: InspectionProblem): Range {
        const position = problem.position;
        const startLine: number = position.startLine;
        let startColumn: number = position.code?.indexOf(problem.identity) ?? -1, endLine: number = -1, endColumn: number = -1;
        if (startColumn > -1) {
            // highlight only the symbol
            endLine = startLine;
            endColumn = startColumn + problem.identity?.length;
        } else {
            // highlight entire first line
            startColumn = position.code.search(/\S/) ?? 0; // first non-whitespace character
            endLine = startLine;
            endColumn = position.code.length; // last character
        }
        return new Range(new Position(startLine, startColumn), new Position(endLine, endColumn));
    }
}