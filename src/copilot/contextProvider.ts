/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
    ResolveRequest,
    SupportedContextItem,
    type ContextProvider,
} from '@github/copilot-language-server';
import * as vscode from 'vscode';
import { CopilotHelper } from './context/copilotHelper';
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import {
    logger,
    JavaContextProviderUtils,
    CancellationError,
    InternalCancellationError,
    CopilotCancellationError,
    ContextResolverFunction,
    CopilotApi
} from './utils';
import { getExtensionName } from '../utils/extension';
import { validateAndInstallExtensionVersion } from "../recommendation";

export async function registerCopilotContextProviders(
    context: vscode.ExtensionContext
) {
    validateAndInstallExtensionVersion("vscjava.vscode-java-dependency", "0.30.2025101702", "the Java Dependency extension is required for Copilot to work properly.")
    try {
        const apis = await JavaContextProviderUtils.getCopilotApis();
        if (!apis.clientApi || !apis.chatApi) {
            logger.info('Failed to find compatible version of GitHub Copilot extension installed. Skip registration of Copilot context provider.');
            return;
        }

        // Register the Java completion context provider
        const provider: ContextProvider<SupportedContextItem> = {
            id: getExtensionName(), // use extension id as provider id for now
            selector: [{ language: "java" }],
            resolver: { resolve: createJavaContextResolver() }
        };

        const installCount = await JavaContextProviderUtils.installContextProviderOnApis(apis, provider, context, installContextProvider);

        if (installCount === 0) {
            logger.info('Incompatible GitHub Copilot extension installed. Skip registration of Java context providers.');
            return;
        }
        
        logger.info('Registration of Java context provider for GitHub Copilot extension succeeded.');
        sendInfo("", {
            "action": "registerCopilotContextProvider",
            "extension": getExtensionName(),
            "status": "succeeded",
            "installCount": installCount
        });
    }
    catch (error) {
        logger.error('Error occurred while registering Java context provider for GitHub Copilot extension:', error);
    }
}

/**
 * Create the Java context resolver function
 */
function createJavaContextResolver(): ContextResolverFunction {
    return async (request: ResolveRequest, copilotCancel: vscode.CancellationToken): Promise<SupportedContextItem[]> => {
        const resolveStartTime = performance.now();
        let logMessage = `Java Context Provider: resolve(${request.documentContext.uri}:${request.documentContext.offset}):`;
        
        try {
            // Check for immediate cancellation
            JavaContextProviderUtils.checkCancellation(copilotCancel);
            
            return await resolveJavaContext(request, copilotCancel);
        } catch (error: any) {
            try {
                JavaContextProviderUtils.handleError(error, 'Java context provider resolve', resolveStartTime, logMessage);
            } catch (handledError) {
                // Return empty array if error handling throws
                return [];
            }
            // This should never be reached due to handleError throwing, but TypeScript requires it
            return [];
        } finally {
            const duration = Math.round(performance.now() - resolveStartTime);
            if (!logMessage.includes('cancellation')) {
                logMessage += `(completed in ${duration}ms)`;
                logger.info(logMessage);
            }
        }
    };
}

/**
 * Send telemetry data for Java context resolution
 */
function sendContextTelemetry(request: ResolveRequest, start: number, itemCount: number, status: string, error?: string) {
    const duration = Math.round(performance.now() - start);
    const telemetryData: any = {
        "action": "resolveJavaContext",
        "completionId": request.completionId,
        "duration": duration,
        "itemCount": itemCount,
        "status": status
    };
    
    if (error) {
        telemetryData.error = error;
    }
    
    sendInfo("", telemetryData);
}

async function resolveJavaContext(request: ResolveRequest, copilotCancel: vscode.CancellationToken): Promise<SupportedContextItem[]> {
    const items: SupportedContextItem[] = [];
    const start = performance.now();
    const documentUri = request.documentContext.uri;
    const caretOffset = request.documentContext.offset;
    
    try {
        // Check for cancellation before starting
        JavaContextProviderUtils.checkCancellation(copilotCancel);
        
        // Get current document and position information
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.languageId !== 'java') {
            return items;
        }

        const document = activeEditor.document;

        // Resolve project dependencies first
        const projectDependencies = await CopilotHelper.resolveProjectDependencies(document.uri, copilotCancel);
        logger.info('Resolved project dependencies count:', Object.keys(projectDependencies).length);
        
        // Check for cancellation after dependency resolution
        JavaContextProviderUtils.checkCancellation(copilotCancel);
        
        // Convert project dependencies to Trait items
        if (projectDependencies && Object.keys(projectDependencies).length > 0) {
            for (const [key, value] of Object.entries(projectDependencies)) {
                items.push({
                    name: key,
                    value: value,
                    importance: 50
                });
            }
        }
        
        // Check for cancellation before resolving imports
        JavaContextProviderUtils.checkCancellation(copilotCancel);

        // Resolve imports directly without caching
        const importClass = await CopilotHelper.resolveLocalImports(document.uri, copilotCancel);
        logger.info('Resolved imports count:', importClass?.length || 0);
        
        // Check for cancellation after resolution
        JavaContextProviderUtils.checkCancellation(copilotCancel);
        
        // Check for cancellation before processing results
        JavaContextProviderUtils.checkCancellation(copilotCancel);

        if (importClass) {
            // Process imports in batches to reduce cancellation check overhead
            const contextItems = JavaContextProviderUtils.createContextItemsFromImports(importClass);
            
            // Check cancellation once after creating all items
            JavaContextProviderUtils.checkCancellation(copilotCancel);
            
            items.push(...contextItems);
        }
    } catch (error: any) {
        if (error instanceof CopilotCancellationError) {
            sendContextTelemetry(request, start, items.length, "cancelled_by_copilot");
            throw error;
        }
        if (error instanceof vscode.CancellationError || error.message === CancellationError.Canceled) {
            sendContextTelemetry(request, start, items.length, "cancelled_internally");
            throw new InternalCancellationError();
        }
        
        // Send telemetry for general errors (but continue with partial results)
        sendContextTelemetry(request, start, items.length, "error_partial_results", error.message || "unknown_error");
        
        logger.error(`Error resolving Java context for ${documentUri}:${caretOffset}:`, error);
        
        // Return partial results and log completion for error case
        JavaContextProviderUtils.logCompletion('Java context resolution', documentUri, caretOffset, start, items.length);
        return items;
    }

    // Send telemetry data once at the end for success case
    sendContextTelemetry(request, start, items.length, "succeeded");
    
    JavaContextProviderUtils.logCompletion('Java context resolution', documentUri, caretOffset, start, items.length);
    return items;
}

export async function installContextProvider(
    copilotAPI: CopilotApi,
    contextProvider: ContextProvider<SupportedContextItem>
): Promise<vscode.Disposable | undefined> {
    const hasGetContextProviderAPI = typeof copilotAPI.getContextProviderAPI === 'function';
    if (hasGetContextProviderAPI) {
        const contextAPI = await copilotAPI.getContextProviderAPI('v1');
        if (contextAPI) {
            return contextAPI.registerContextProvider(contextProvider);
        }
    }
    return undefined;
}
