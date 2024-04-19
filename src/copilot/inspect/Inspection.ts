import { TextDocument, workspace, window, Selection, Range, Position } from "vscode";

export interface Inspection {
    document?: TextDocument;
    problem: {
        /**
         * short description of the problem
         */
        description: string;
        position: {
            /**
             * real line number to the start of the document, will change
             */
            line: number;
            /**
             * relative line number to the start of the symbol(method/class), won't change
             */
            relativeLine: number;
            /**
             * code of the first line of the problematic code block
             */
            code: string;
        };
        /**
         * symbol name of the problematic code block, e.g. method name/class name, keywork, etc.
         */
        symbol: string;
    }
    solution: string;
    severity: string;
}

export namespace Inspection {
    export function highlight(inspection: Inspection) {
        inspection.document && void workspace.openTextDocument(inspection.document.uri).then(document => {
            void window.showTextDocument(document).then(editor => {
                const range = document.lineAt(inspection.problem.position.line).range;
                editor.selection = new Selection(range.start, range.end);
                editor.revealRange(range);
            });
        });
    }

    export function calculateHintPosition(problem: Inspection['problem']): Range {
        const position = problem.position;
        const startLine: number = position.line;
        let startColumn: number = position.code.indexOf(problem.symbol), endLine: number = -1, endColumn: number = -1;
        if (startColumn > -1) {
            // highlight only the symbol
            endLine = position.line;
            endColumn = startColumn + problem.symbol?.length;
        } else {
            // highlight entire first line
            startColumn = position.code.search(/\S/) ?? 0; // first non-whitespace character
            endLine = position.line;
            endColumn = position.code.length; // last character
        }
        return new Range(new Position(startLine, startColumn), new Position(endLine, endColumn));
    }
}