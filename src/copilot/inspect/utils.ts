import * as crypto from "crypto";
import { DocumentSymbol, LogOutputChannel, Position, Range, Selection, SymbolKind, TextDocument, commands, extensions, window } from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { Inspection } from ".";

export const DEFAULT_JAVA_VERSION = 17;
export const CLASS_KINDS: SymbolKind[] = [SymbolKind.Class, SymbolKind.Interface, SymbolKind.Enum];
export const METHOD_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Constructor];

export const DEPENDENT_EXTENSIONS = ['github.copilot-chat', 'redhat.java'];

export async function checkDependencyExtensions(): Promise<void> {
    for (const id of DEPENDENT_EXTENSIONS) {
        const extension = extensions.getExtension(id);
        if (extension === undefined) {
            const result = await window.showWarningMessage(`This feature depends on extension "${id}", do you want to install it?`, { modal: true }, 'Install');
            if (result === 'Install') {
                await commands.executeCommand('workbench.extensions.installExtension', id);
            } else {
                throw new Error(`Extension "${id}" is not installed.`);
            }
        }
    }
    for (const id of DEPENDENT_EXTENSIONS) {
        const extension = extensions.getExtension(id);
        if (extension?.isActive) {
            window.showWarningMessage(`Please try later after extension "${extension?.packageJSON.name}" is activated.`);
            throw new Error(`Extension "${extension?.packageJSON.name}" is not activated.`);
        }
    }
}

export async function isJavaExtensionReady(): Promise<void> {
    const extension = extensions.getExtension('redhat.java');
    if (extension?.isActive) {
        window.showWarningMessage(`Please try later after extension "${extension?.packageJSON.name}" is activated.`);
        throw new Error(`Extension "${extension?.packageJSON.name}" is not activated.`);
    }
}

export function debounce(func: (...args: any[]) => void, wait = 800) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * uncapitalize a string
 */
export function uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * generate a unique id for the symbol, and wont change if the symbol's body is not changed
 */
export function calculateSymbolVersionId(document: TextDocument, symbol: DocumentSymbol): string {
    const body = document.getText(symbol.range);
    return crypto.createHash('md5').update(body).digest("hex")
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

export async function getProjectJavaVersion(document: TextDocument) {
    const uri = document.uri.toString();
    const key = "org.eclipse.jdt.core.compiler.source";
    const settings: { [key]: string } = await commands.executeCommand("java.project.getSettings", uri, [key]);
    return parseInt(settings[key]) || 17;
}

export async function getContainedClassesOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const classes = getClassesAndMethodsOfSymbols(stack).filter(symbol => CLASS_KINDS.includes(symbol.kind));
    return classes.filter(clazz => range.contains(clazz.range));
}

export async function getIntersectionMethodsOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const methods = getClassesAndMethodsOfSymbols(stack).filter(symbol => METHOD_KINDS.includes(symbol.kind));
    return methods.filter(method => method.range.intersection(range));
}

export async function getContainingClassOfRange(range: Range | Selection, document: TextDocument): Promise<DocumentSymbol> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    const classes = getClassesAndMethodsOfSymbols(stack).filter(symbol => CLASS_KINDS.includes(symbol.kind));
    // reverse the classes to get the innermost class first
    return classes.reverse().filter(clazz => clazz.range.contains(range))[0];
}

export function getUnionRange(symbols: DocumentSymbol[]): Range {
    let result: Range = new Range(symbols[0].range.start, symbols[0].range.end);
    for (const method of symbols) {
        result = result.union(method.range);
    }
    return result;
}

export async function getClassesAndMethodsOfDoc(document: TextDocument): Promise<DocumentSymbol[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse();
    return getClassesAndMethodsOfSymbols(stack);
}

export async function getFirstLevelClassesOfDoc(document: TextDocument): Promise<DocumentSymbol[]> {
    const symbols = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind));
}

function getClassesAndMethodsOfSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {
    const stack = symbols;

    const result: DocumentSymbol[] = [];
    while (stack.length > 0) {
        const symbol = stack.pop() as DocumentSymbol;
        if (CLASS_KINDS.includes(symbol.kind)) {
            result.push(symbol);
            stack.push(...symbol.children.reverse());
        } else if (METHOD_KINDS.includes(symbol.kind)) {
            result.push(symbol);
        }
    }
    return result;
}

export function isEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export async function waitUntilExtensionsActivated(extensionIds: string[], interval: number = 1500) {
    const start = Date.now();
    return new Promise<void>((resolve) => {
        if (extensionIds.every(id => extensions.getExtension(id)?.isActive)) {
            logger.info(`All dependent extensions [${extensionIds.join(', ')}] are activated.`);
            return resolve();
        }
        const notInstalledExtensionIds = extensionIds.filter(id => !extensions.getExtension(id));
        if (notInstalledExtensionIds.length > 0) {
            sendInfo('java.copilot.inspection.dependentExtensions.notInstalledExtensions', { extensionIds: `[${notInstalledExtensionIds.join(',')}]` });
            logger.info(`Dependent extensions [${notInstalledExtensionIds.join(', ')}] are not installed, setting interval to 10s.`);
        } else {
            logger.info(`All dependent extensions are installed, but some are not activated, keep interval ${interval}ms.`);
        }
        interval = notInstalledExtensionIds ? interval : 10000;
        const id = setInterval(() => {
            if (extensionIds.every(id => extensions.getExtension(id)?.isActive)) {
                clearInterval(id);
                sendInfo('java.copilot.inspection.dependentExtensions.waited', { time: Date.now() - start });
                logger.info(`waited for ${Date.now() - start}ms for all dependent extensions [${extensionIds.join(', ')}] to be installed/activated.`);
                resolve();
            }
        }, interval);
    });
}

export const logger: LogOutputChannel = window.createOutputChannel("Rewriting Suggestions", { log: true });
