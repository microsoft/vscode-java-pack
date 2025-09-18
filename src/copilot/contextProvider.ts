/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
    ContextProviderApiV1,
    ResolveRequest,
    SupportedContextItem,
    type ContextProvider,
} from '@github/copilot-language-server';
import * as vscode from 'vscode';
import { CopilotHelper } from './context/copilotHelper';
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { contextCache } from './context/contextCache';
import { TreatmentVariables } from '../exp/TreatmentVariables';
import { getExpService } from '../exp';
import { logger, getProjectJavaVersion } from './utils';
import { getExtensionName } from '../utils/extension';

export async function registerCopilotContextProviders(
    context: vscode.ExtensionContext
) {
    const contextProviderIsEnabled = await getExpService().getTreatmentVariableAsync(TreatmentVariables.VSCodeConfig, TreatmentVariables.ContextProvider, true);
    if (!contextProviderIsEnabled) {
        sendInfo("", {
            "contextProviderEnabled": "false",
        });
        return;
    }
    sendInfo("", {
        "contextProviderEnabled": "true",
    });
    
    // Initialize the context cache
    contextCache.initialize(context);
    
    try {
        const copilotClientApi = await getCopilotClientApi();
        const copilotChatApi = await getCopilotChatApi();
        if (!copilotClientApi || !copilotChatApi) {
            logger.error('Failed to find compatible version of GitHub Copilot extension installed. Skip registration of Copilot context provider.');
            return;
        }
        // Register the Java completion context provider
        const provider: ContextProvider<SupportedContextItem> = {
            id: getExtensionName(), // use extension id as provider id for now
            selector: [{ language: "java" }],
            resolver: {
                resolve: async (request, token) => {                    
                    // Check if we have a cached result for the current active editor
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.languageId === 'java') {
                        const cachedImports = contextCache.get(activeEditor.document.uri);
                        if (cachedImports) {
                            logger.info('======== Using cached imports, cache size:', cachedImports.length);
                            // Return cached result as context items
                            return cachedImports.map((cls: any) => ({
                                uri: cls.uri,
                                value: cls.className,
                                importance: 70,
                                origin: 'request' as const
                            }));
                        }
                    }
                    
                    return await resolveJavaContext(request, token);
                }
            }
        };

        let installCount = 0;
        if (copilotClientApi) {
            const disposable = await installContextProvider(copilotClientApi, provider);
            if (disposable) {
                context.subscriptions.push(disposable);
                installCount++;
            }
        }
        if (copilotChatApi) {
            const disposable = await installContextProvider(copilotChatApi, provider);
            if (disposable) {
                context.subscriptions.push(disposable);
                installCount++;
            }
        }

        if (installCount === 0) {
            logger.warn('Incompatible GitHub Copilot extension installed. Skip registration of Java context providers.');
            return;
        }
        logger.info('Registration of Java context provider for GitHub Copilot extension succeeded.');
    }
    catch (error) {
        logger.error('Error occurred while registering Java context provider for GitHub Copilot extension:', error);
    }
}

async function resolveJavaContext(_request: ResolveRequest, _token: vscode.CancellationToken): Promise<SupportedContextItem[]> {
    const items: SupportedContextItem[] = [];
    const start = performance.now();
    try {
        // Get current document and position information
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.languageId !== 'java') {
            return items;
        }

        const document = activeEditor.document;

        // 1. Project basic information (High importance)
        const javaVersion = await getProjectJavaVersion(document);

        items.push({
            name: 'java.version',
            value: javaVersion,
            importance: 90,
            id: 'java-version',
            origin: 'request'
        });

        items.push({
            name: 'java.file',
            value: vscode.workspace.asRelativePath(document.uri),
            importance: 80,
            id: 'java-file-path',
            origin: 'request'
        });

        // Try to get cached imports first
        let importClass = contextCache.get(document.uri);
        if (!importClass) {
            // If not cached, resolve and cache the result
            importClass = await CopilotHelper.resolveLocalImports(document.uri);
            if (importClass) {
                contextCache.set(document.uri, importClass);
                logger.info('======== Cached new imports, cache size:', importClass.length);
            }
        } else {
            logger.info('======== Using cached imports in resolveJavaContext, cache size:', importClass.length);
        }
        
        if (importClass) {
            for (const cls of importClass) {
                items.push({
                    uri: cls.uri,
                    value: cls.className,
                    importance: 70,
                    origin: 'request'
                });
            }
        }
    } catch (error) {
        logger.error('Error resolving Java context:', error);
    }
    logger.info('Total context resolution time:', performance.now() - start, 'ms', ' ,size:', items.length);
    logger.info('Context items:', items);
    return items;
}

interface CopilotApi {
    getContextProviderAPI(version: string): Promise<ContextProviderApiV1 | undefined>;
}

async function getCopilotClientApi(): Promise<CopilotApi | undefined> {
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

async function getCopilotChatApi(): Promise<CopilotApi | undefined> {
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

async function installContextProvider(
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
