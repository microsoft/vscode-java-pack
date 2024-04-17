import { DocumentSymbol, ExtensionContext, Position, ProgressLocation, Range, Selection, SymbolKind, TextDocument, commands, window } from "vscode";
import { output } from '../output';
import { cacheClassAndMethodInspections } from './cache';
import { inspectCode, inspectCodeDebouncely } from './inspect.code';
import { getContainedClassesOfRange, getContainingClassOfRange, getIntersectionMethodsOfRange, getUnionRange, getProjectJavaVersion } from './utils';
import path = require('path');
import { COMMAND_FIX, COMMAND_HIGHLIGHT } from "../commands";

export const JAVA_COPILOT_FEATURE_GROUP = 'java.copilot';

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

export interface InspectionRenderer {
    install(context: ExtensionContext): void;
    uninstall(): void;
    clear(document?: TextDocument): void;
    rerender(document: TextDocument): void;
    renderInspections(document: TextDocument, inspections: Inspection[]): void;
}

export async function inspectDocument(document: TextDocument): Promise<Inspection[]> {
    const range = new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);
    return inspectRange(document, range);
}

export async function inspectClass(document: TextDocument, clazz: DocumentSymbol): Promise<Inspection[]> {
    return inspectRange(document, clazz.range);
}

export async function inspectSymbol(document: TextDocument, symbol: DocumentSymbol): Promise<Inspection[]> {
    return inspectRange(document, symbol.range);
}

export async function inspectRange(document: TextDocument, range: Range | Selection): Promise<Inspection[]> {
    const methods: DocumentSymbol[] = await getIntersectionMethodsOfRange(range, document);
    const classes: DocumentSymbol[] = await getContainedClassesOfRange(range, document);
    const symbols: DocumentSymbol[] = [...classes, ...methods];
    if (symbols.length < 1) {
        const containingClass: DocumentSymbol = await getContainingClassOfRange(range, document);
        symbols.push(containingClass);
    }
    const expandedRange: Range = getUnionRange(symbols);
    const symbolName = symbols[0].name;
    const symbolKind = SymbolKind[symbols[0].kind].toLowerCase();
    const inspections = await window.withProgress({
        location: ProgressLocation.Notification,
        title: `Inspecting ${symbolKind} ${symbolName}... of \"${path.basename(document.fileName)}\"`,
        cancellable: false
    }, (_progress) => {
        return doInspectRange(document, expandedRange);
    });
    if (inspections.length < 1) {
        void window.showInformationMessage(`Inspected ${symbolKind} ${symbolName}... of \"${path.basename(document.fileName)}\" and got 0 suggestions.`);
    } else if (inspections.length == 1) {
        void commands.executeCommand(COMMAND_FIX, inspections[0].problem, inspections[0].solution);
    } else {
        void window.showInformationMessage(`Inspected ${symbolKind} ${symbolName}... of \"${path.basename(document.fileName)}\" and got ${inspections.length} suggestions.`, "Go to").then(selection => {
            selection === "Go to" && void commands.executeCommand(COMMAND_HIGHLIGHT, inspections[0]);
        });
    }
    cacheClassAndMethodInspections(inspections, symbols, document);
    return inspections;
}

// @ts-ignore unusd method
function doInspectDocument(document: TextDocument): Promise<Inspection[]> {
    const documentKey = document.uri.fsPath;
    const content: string = document.getText();
    const result = inspectCodeDebouncely(content, documentKey, 3000).then((inspections: Inspection[]) => {
        inspections.forEach(inspection => inspection.document = document);
        return inspections;
    });
    return result;
}

// @ts-ignore unusd method
async function doInspectSymbol(document: TextDocument, symbol: DocumentSymbol): Promise<Inspection[]> {
    output.debug('inspecting symbol:', symbol.name);
    const range = new Range(new Position(symbol.range.start.line, 0), symbol.range.end);
    const content: string = document.getText(range);
    const symbolKey = `${document.uri.fsPath}:${symbol.name}`;
    const offset = symbol.range.start.line;
    const inspections = await inspectCodeDebouncely(content, symbolKey, 3000);
    inspections.forEach(s => {
        s.document = document;
        s.problem.position.line = s.problem.position.relativeLine + offset;
    });
    return inspections;
}

async function doInspectRange(document: TextDocument, range: Range | Selection): Promise<Inspection[]> {
    const adjustedRange = new Range(new Position(range.start.line, 0), new Position(range.end.line, document.lineAt(range.end.line).text.length));
    const content: string = document.getText(adjustedRange);
    const offset = range.start.line;
    const javaVersion = await getProjectJavaVersion(document);
    const inspections = await inspectCode(content, javaVersion);
    inspections.forEach(s => {
        s.document = document;
        s.problem.position.line = s.problem.position.relativeLine + offset; // calculate real line number
    });
    return inspections;
}
