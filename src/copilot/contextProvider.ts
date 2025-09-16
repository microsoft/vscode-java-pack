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
import { TreatmentVariables } from '../exp/TreatmentVariables';
import { getExpService } from '../exp';
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { resolveLocalImports } from "../commands/handler";
import { logger, getProjectJavaVersion } from './utils';

export enum NodeKind {
    Workspace = 1,
    Project = 2,
    PackageRoot = 3,
    Package = 4,
    PrimaryType = 5,
    CompilationUnit = 6,
    ClassFile = 7,
    Container = 8,
    Folder = 9,
    File = 10,
}

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
    try {
        const copilotClientApi = await getCopilotClientApi();
        const copilotChatApi = await getCopilotChatApi();
        if (!copilotClientApi && !copilotChatApi) {
            logger.warn('Failed to find compatible version of GitHub Copilot extension installed. Skip registration of Copilot context provider.');
            return;
        }
        // Register the Java completion context provider
        const javaCompletionProvider = {
            id: 'vscjava.vscode-java-pack',
            selector: [{ language: 'java' }],
            resolver: {
                resolve: async (request: ResolveRequest, token: vscode.CancellationToken) => {
                    return await resolveJavaContext(request, token);
                }
            },
        }
        let completionProviderInstallCount = 0;

        if (copilotClientApi) {
            const disposable = await installContextProvider(copilotClientApi, javaCompletionProvider);
            if (disposable) {
                context.subscriptions.push(disposable);
                completionProviderInstallCount++;
            }
        }
        if (copilotChatApi) {
            const disposable = await installContextProvider(copilotChatApi, javaCompletionProvider);
            if (disposable) {
                context.subscriptions.push(disposable);
                completionProviderInstallCount++;
            }
        }

        if (completionProviderInstallCount > 0) {
            logger.info('Registration of Java completion context provider for GitHub Copilot extension succeeded.');
        } else {
            logger.warn('Failed to register Java completion context provider for GitHub Copilot extension.');
        }
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
        const packageName = await getPackageName(document);

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

        items.push({
            name: 'java.package',
            value: packageName,
            importance: 85,
            id: 'java-package-name',
            origin: 'request'
        });

        const importClass = await resolveLocalImports(document.uri);
        for (const cls of importClass) {
            items.push({
                uri: cls.uri,
                value: cls.className,
                importance: 70,
                origin: 'request'
            });
        }
    } catch (error) {
        logger.error('Error resolving Java context:', error);
        // Add error information as context to help with debugging
        items.push({
            name: 'java.context.error',
            value: `${error}`,
            importance: 10,
            id: 'java-context-error',
            origin: 'request'
        });
    }
    logger.debug('Context Provider total size:', items.length, ' time:', performance.now() - start);
    return items;
}

async function getPackageName(document: vscode.TextDocument): Promise<string> {
    try {
        const text = document.getText();
        const packageMatch = text.match(/^\s*package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/m);
        return packageMatch ? packageMatch[1] : 'default package';
    } catch (error) {
        console.log('Failed to get package name:', error);
        return 'unknown';
    }
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
