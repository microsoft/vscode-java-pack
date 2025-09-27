import { LogOutputChannel, SymbolKind, TextDocument, commands, window, Range, Selection, workspace, DocumentSymbol, version } from "vscode";
import * as vscode from 'vscode';
import { SymbolNode } from "./inspect/SymbolNode";
import { SemVer } from "semver";
import { createUuid, sendOperationEnd, sendOperationError, sendOperationStart } from "vscode-extension-telemetry-wrapper";
import {
    ContextProviderApiV1,
    ResolveRequest,
    SupportedContextItem,
    type ContextProvider,
} from '@github/copilot-language-server';

export const CLASS_KINDS: SymbolKind[] = [SymbolKind.Class, SymbolKind.Interface, SymbolKind.Enum];
export const METHOD_KINDS: SymbolKind[] = [SymbolKind.Method, SymbolKind.Constructor];
export const FIELD_KINDS: SymbolKind[] = [SymbolKind.Field, SymbolKind.Property, SymbolKind.Constant];

export const logger: LogOutputChannel = window.createOutputChannel("Java Rewriting Suggestions", { log: true });

/**
 * get all the class symbols contained in the `range` in the `document`
 */
export async function getClassesContainedInRange(range: Range | Selection, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        .filter(clazz => range.contains(clazz.range));
}

export async function getSymbolsContainedInRange(range: Range | Selection, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => range.contains(symbol.range));
}

/**
 * get the innermost class symbol that completely contains the `range` in the `document`
 */
export async function getInnermostClassContainsRange(range: Range | Selection, document: TextDocument): Promise<SymbolNode> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind))
        // reverse the classes to get the innermost class first
        .reverse().filter(clazz => clazz.range.contains(range))[0];
}

/**
 * get all the method/field symbols that are completely or partially contained in the `range` in the `document`
 */
export async function getIntersectionSymbolsOfRange(range: Range | Selection, document: TextDocument): Promise<SymbolNode[]> {
    const symbols = await getSymbolsOfDocument(document);
    return symbols.filter(symbol => METHOD_KINDS.includes(symbol.kind) || FIELD_KINDS.includes(symbol.kind))
        .filter(method => method.range.intersection(range));
}

export function getUnionRange(symbols: SymbolNode[]): Range {
    let result: Range = new Range(symbols[0].range.start, symbols[0].range.end);
    for (const symbol of symbols) {
        result = result.union(symbol.range);
    }
    return result;
}

/**
 * get all classes (classes inside methods are not considered) and methods of a document in a pre-order traversal manner
 */
export async function getSymbolsOfDocument(document: TextDocument): Promise<SymbolNode[]> {
    const stack = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []).reverse().map(symbol => new SymbolNode(document, symbol));

    const result: SymbolNode[] = [];
    while (stack.length > 0) {
        const symbol = stack.pop() as SymbolNode;
        if (CLASS_KINDS.includes(symbol.kind)) {
            result.push(symbol);
            stack.push(...symbol.children.reverse());
        } else if (METHOD_KINDS.includes(symbol.kind) || FIELD_KINDS.includes(symbol.kind)) {
            result.push(symbol);
        }
    }
    return result;
}

export async function getTopLevelClassesOfDocument(document: TextDocument): Promise<SymbolNode[]> {
    const symbols = ((await commands.executeCommand<DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)) ?? []);
    return symbols.filter(symbol => CLASS_KINDS.includes(symbol.kind)).map(symbol => new SymbolNode(document, symbol));
}

export function uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
}

export function isCodeLensDisabled(): boolean {
    const editorConfig = workspace.getConfiguration('editor');
    const enabled = editorConfig.get<boolean>('codeLens');
    // If it's explicitly set to false, CodeLens is turned off
    return enabled === false;
}

export async function getProjectJavaVersion(document: TextDocument): Promise<string> {
    const uri = document.uri.toString();
    const key = "org.eclipse.jdt.core.compiler.source";
    try {
        const settings: { [key]: string } = await retryOnFailure(async () => {
            return await commands.executeCommand("java.project.getSettings", uri, [key]);
        });
        return settings[key] ?? '17';
    } catch (e) {
        throw new Error(`Failed to get Java version, please check if the project is loaded normally: ${e}`);
    }
}

export async function retryOnFailure<T>(task: () => Promise<T>, timeout: number = 15000, retryInterval: number = 3000): Promise<T> {
    const startTime = Date.now();

    while (true) {
        try {
            return await task();
        } catch (error) {
            if (Date.now() - startTime >= timeout) {
                throw error;
            } else {
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }
    }
}

export function isLlmApiReady(): boolean {
    return new SemVer(version).compare(new SemVer("1.90.0-insider")) >= 0;
}

/**
 * copied from vscode-extension-telemetry-wrapper, the only difference is we re-throw the error to the caller but the original one doesn't.
 */
export function fixedInstrumentOperation(
    operationName: string,
    cb: (operationId: string, ...args: any[]) => any,
    thisArg?: any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const operationId = createUuid();
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, operationName);
            return await cb.apply(thisArg, [operationId, ...args]);
        } catch (e) {
            error = e as Error;
            sendOperationError(operationId, operationName, error);
            // NOTE: re-throw the error to the caller
            throw e;
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    };
}

/**
 * copied from vscode-extension-telemetry-wrapper, the only difference is we re-throw the error to the caller but the original one doesn't.
 */
export function fixedInstrumentSimpleOperation(operationName: string, cb: (...args: any[]) => any, thisArg?: any): (...args: any[]) => any {
    return fixedInstrumentOperation(operationName, async (_operationId, ...args) => await cb.apply(thisArg, args), thisArg /** unnecessary */);
}

/**
 * Error classes for Copilot context provider cancellation handling
 */
export class CancellationError extends Error {
    static readonly Canceled = "Canceled";
    constructor() {
        super(CancellationError.Canceled);
        this.name = this.message;
    }
}

export class InternalCancellationError extends CancellationError {
}

export class CopilotCancellationError extends CancellationError {
}

/**
 * Type definitions for common patterns
 */
export type ContextResolverFunction = (request: ResolveRequest, token: vscode.CancellationToken) => Promise<SupportedContextItem[]>;

export interface CopilotApiWrapper {
    clientApi?: CopilotApi;
    chatApi?: CopilotApi;
}

export interface CopilotApi {
    getContextProviderAPI(version: string): Promise<ContextProviderApiV1 | undefined>;
}

/**
 * Utility class for handling common operations in Java Context Provider
 */
export class JavaContextProviderUtils {
    /**
     * Check if operation should be cancelled and throw appropriate error
     */
    static checkCancellation(token: vscode.CancellationToken): void {
        if (token.isCancellationRequested) {
            throw new CopilotCancellationError();
        }
    }

    /**
     * Handle errors with appropriate logging and re-throwing
     */
    static handleError(error: any, operation: string, startTime: number, logMessage: string): never {
        const duration = Math.round(performance.now() - startTime);
        
        if (error instanceof CopilotCancellationError) {
            const message = `${logMessage}(copilot cancellation after ${duration}ms)`;
            logger.info(message);
            throw error;
        }
        if (error instanceof InternalCancellationError) {
            const message = `${logMessage}(internal cancellation after ${duration}ms)`;
            logger.info(message);
            throw error;
        }
        if (error instanceof vscode.CancellationError || error.message === CancellationError.Canceled) {
            const message = `${logMessage}(cancellation after ${duration}ms)`;
            logger.info(message);
            throw new CancellationError();
        }
        
        logger.error(`Error in ${operation}:`, error);
        throw error;
    }

    /**
     * Create context items from import classes
     */
    static createContextItemsFromImports(importClasses: any[]): SupportedContextItem[] {
        return importClasses.map((cls: any) => ({
            uri: cls.uri,
            value: cls.className,
            importance: 70,
            origin: 'request' as const
        }));
    }

    /**
     * Create a basic Java version context item
     */
    static createJavaVersionItem(javaVersion: string): SupportedContextItem {
        return {
            name: 'java.version',
            value: javaVersion,
            importance: 90,
            id: 'java-version',
            origin: 'request'
        };
    }

    /**
     * Log completion with timing information
     */
    static logCompletion(operation: string, documentUri: string, caretOffset: number, startTime: number, itemCount: number): void {
        const duration = Math.round(performance.now() - startTime);
        logger.info(`${operation} for ${documentUri}:${caretOffset} completed in ${duration}ms with ${itemCount} items`);
    }

    /**
     * Get and validate Copilot APIs
     */
    static async getCopilotApis(): Promise<CopilotApiWrapper> {
        const copilotClientApi = await getCopilotClientApi();
        const copilotChatApi = await getCopilotChatApi();
        return { clientApi: copilotClientApi, chatApi: copilotChatApi };
    }

    /**
     * Install context provider on available APIs
     */
    static async installContextProviderOnApis(
        apis: CopilotApiWrapper, 
        provider: ContextProvider<SupportedContextItem>, 
        context: vscode.ExtensionContext,
        installFn: (api: CopilotApi, provider: ContextProvider<SupportedContextItem>) => Promise<vscode.Disposable | undefined>
    ): Promise<number> {
        let installCount = 0;
        
        if (apis.clientApi) {
            const disposable = await installFn(apis.clientApi, provider);
            if (disposable) {
                context.subscriptions.push(disposable);
                installCount++;
            }
        }
        
        if (apis.chatApi) {
            const disposable = await installFn(apis.chatApi, provider);
            if (disposable) {
                context.subscriptions.push(disposable);
                installCount++;
            }
        }
        
        return installCount;
    }
}

/**
 * Get Copilot client API
 */
export async function getCopilotClientApi(): Promise<CopilotApi | undefined> {
    const extension = vscode.extensions.getExtension<CopilotApi>('github.copilot');
    if (!extension) {
        return undefined;
    }
    try {
        return await extension.activate();
    } catch {
        return undefined;
    }
}

/**
 * Get Copilot chat API
 */
export async function getCopilotChatApi(): Promise<CopilotApi | undefined> {
    type CopilotChatApi = { getAPI?(version: number): CopilotApi | undefined };
    const extension = vscode.extensions.getExtension<CopilotChatApi>('github.copilot-chat');
    if (!extension) {
        return undefined;
    }

    let exports: CopilotChatApi | undefined;
    try {
        exports = await extension.activate();
    } catch {
        return undefined;
    }
    if (!exports || typeof exports.getAPI !== 'function') {
        return undefined;
    }
    return exports.getAPI(1);
}