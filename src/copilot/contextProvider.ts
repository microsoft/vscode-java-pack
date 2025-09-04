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
import { 
    getProjectJavaVersion, 
    getSymbolsOfDocument, 
    getInnermostClassContainsRange,
    getIntersectionSymbolsOfRange,
    getTopLevelClassesOfDocument,
    logger 
} from './utils';
import { SymbolNode } from './inspect/SymbolNode';

export async function registerCopilotContextProviders(
    context: vscode.ExtensionContext
) {
    try {
        const copilotClientApi = await getCopilotClientApi();
        const copilotChatApi = await getCopilotChatApi();
        if (!copilotClientApi && !copilotChatApi) {
            console.log('Failed to find compatible version of GitHub Copilot extension installed. Skip registration of Copilot context provider.');
            logger.error(
                'Failed to find compatible version of GitHub Copilot extension installed. Skip registration of Copilot context provider.'
            );
            return;
        }

        const provider: ContextProvider<SupportedContextItem> = {
            id: 'vscjava.vscode-java-pack', // use extension id as provider id for now
            selector: [{ language: "java" }],
            resolver: {
                resolve: async (request, token) => {
                    console.log('======== java request:', request);
                    console.log('======== java token:', token);
                    const items =  await resolveJavaContext(request, token);
                    console.log('======== java context end ===========')
                    return items;
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
            console.log('Incompatible GitHub Copilot extension installed. Skip registration of Java context providers.');
            logger.info(
                'Incompatible GitHub Copilot extension installed. Skip registration of Java context providers.'
            );
            return;
        }
        console.log('Registration of Java context provider for GitHub Copilot extension succeeded.');
        logger.info('Registration of Java context provider for GitHub Copilot extension succeeded.');
    }
    catch (error) {
        console.log('Error occurred while registering Java context provider for GitHub Copilot extension:', error);
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
        const position = activeEditor.selection.active;
        const currentRange = activeEditor.selection.isEmpty 
            ? new vscode.Range(position, position)
            : activeEditor.selection;

        // 1. Project basic information (High importance)
        const projectContext = await collectProjectContext(document);
        const packageName = await getPackageName(document);
        
        items.push({
            name: 'java.version',
            value: projectContext.javaVersion,
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
        console.log('1. Project basic information (High importance)', performance.now() - start);

        // 2. Current class context information (High importance)
        const currentClass = await getInnermostClassContainsRange(currentRange, document);
        if (currentClass) {
            items.push({
                name: 'java.current.class',
                value: currentClass.qualifiedName,
                importance: 95,
                id: 'java-current-class',
                origin: 'request'
            });
            
            items.push({
                name: 'java.current.class.type',
                value: vscode.SymbolKind[currentClass.kind],
                importance: 80,
                id: 'java-current-class-type',
                origin: 'request'
            });
            
            const classInfo = await getClassContextInfo(document, currentClass);
            if (classInfo) {
                items.push({
                    name: 'java.current.class.members',
                    value: classInfo,
                    importance: 85,
                    id: 'java-current-class-members',
                    origin: 'request'
                });
            }
        }
        console.log('2. Current class context information (High importance)', performance.now() - start);

        // 3. Symbols information within current range (Medium-High importance)
        const symbolsInRange = await getIntersectionSymbolsOfRange(currentRange, document);
        if (symbolsInRange.length > 0) {
            const symbolsInfo = symbolsInRange.map(symbol => 
                `${vscode.SymbolKind[symbol.kind]}: ${symbol.symbol.name}`
            ).join(', ');
            
            items.push({
                name: 'java.current.symbols',
                value: symbolsInfo,
                importance: 75,
                id: 'java-current-symbols',
                origin: 'request'
            });
        }
        console.log('3. Symbols information within current range (Medium-High importance)', performance.now() - start);

        // 4. File-level classes and interfaces information (Medium importance)
        const topLevelClasses = await getTopLevelClassesOfDocument(document);
        if (topLevelClasses.length > 0) {
            const classesInfo = topLevelClasses.map(clazz => 
                `${vscode.SymbolKind[clazz.kind]}: ${clazz.symbol.name}`
            ).join(', ');
            
            items.push({
                name: 'java.file.classes',
                value: classesInfo,
                importance: 70,
                id: 'java-file-classes',
                origin: 'request'
            });
        }
        console.log('4. File-level classes and interfaces information (Medium importance)', performance.now() - start);

        // 5. Import information (Medium importance)
        const imports = await getImportStatements(document);
        if (imports.length > 0) {
            items.push({
                name: 'java.imports',
                value: imports.slice(0, 20).join('; '),  // Limit to avoid too long strings
                importance: 60,
                id: 'java-imports',
                origin: 'request'
            });
        }
        console.log('5. Import information (Medium importance)', performance.now() - start);

        // 6. Project dependencies and classpath information (Medium importance)
        const projectDependencies = await getProjectDependencies(document.uri);
        if (projectDependencies) {
            items.push({
                name: 'java.dependencies',
                value: projectDependencies,
                importance: 55,
                id: 'java-dependencies',
                origin: 'request'
            });
        }
        console.log('6. Project dependencies and classpath information (Medium importance)', performance.now() - start);

        // 7. Compiler and project settings (Medium importance)
        const compilerSettings = await getCompilerSettings(document.uri);
        if (compilerSettings) {
            items.push({
                name: 'java.compiler.settings',
                value: compilerSettings,
                importance: 50,
                id: 'java-compiler-settings',
                origin: 'request'
            });
        }
        console.log('7. Compiler and project settings (Medium importance)', performance.now() - start);

        // 8. Current file content as CodeSnippet for context (High importance)
        // const fileContent = document.getText();
        // if (fileContent.length > 0 && fileContent.length < 10000) { // Limit file size
        //     items.push({
        //         uri: document.uri.toString(),
        //         value: fileContent,
        //         importance: 85,
        //         id: 'java-current-file-content',
        //         origin: 'request'
        //     });
        // }
        // console.log('8. Current file content as CodeSnippet for context (High importance)', performance.now() - start);

        // 9. Current class content as CodeSnippet if available (High importance)
        // if (currentClass) {
        //     const classText = document.getText(currentClass.range);
        //     if (classText.length > 0 && classText.length < 5000) { // Limit class size
        //         items.push({
        //             uri: `${document.uri.toString()}#${currentClass.symbol.name}`,
        //             value: classText,
        //             importance: 90,
        //             id: 'java-current-class-content',
        //             origin: 'request'
        //         });
        //     }
        // }
        // console.log('9. Current class content as CodeSnippet for context (High importance)', performance.now() - start);
    } catch (error) {
        console.log('Error resolving Java context:', error);
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
    console.log('Total context resolution time:', performance.now() - start);
    console.log('===== Resolved context items:', JSON.stringify(items));
    console.log('===== Size of context items:', items.length);
    return items;
}

async function collectProjectContext(document: vscode.TextDocument): Promise<{ javaVersion: string }> {
    try {
        const javaVersion = await getProjectJavaVersion(document);
        return { javaVersion };
    } catch (error) {
        console.log('Failed to get Java version:', error);
        logger.error('Failed to get Java version:', error);
        return { javaVersion: 'unknown' };
    }
}

async function getClassContextInfo(document: vscode.TextDocument, classSymbol: SymbolNode): Promise<string> {
    try {
        const info: string[] = [];
        
        // Get class member information
        const allSymbols = await getSymbolsOfDocument(document);
        const classMembers = allSymbols.filter(symbol => 
            classSymbol.range.contains(symbol.range) && symbol !== classSymbol
        );

        const methods = classMembers.filter(s => s.kind === vscode.SymbolKind.Method || s.kind === vscode.SymbolKind.Constructor);
        const fields = classMembers.filter(s => s.kind === vscode.SymbolKind.Field || s.kind === vscode.SymbolKind.Property);

        if (methods.length > 0) {
            info.push(`Methods: ${methods.map(m => m.symbol.name).join(', ')}`);
        }
        if (fields.length > 0) {
            info.push(`Fields: ${fields.map(f => f.symbol.name).join(', ')}`);
        }

        return info.join('\n');
    } catch (error) {
        console.log('Failed to get class context info:', error);
        logger.error('Failed to get class context info:', error);
        return 'Unable to get class context info';
    }
}

async function getPackageName(document: vscode.TextDocument): Promise<string> {
    try {
        const text = document.getText();
        const packageMatch = text.match(/^\s*package\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*;/m);
        return packageMatch ? packageMatch[1] : 'default package';
    } catch (error) {
        console.log('Failed to get package name:', error);
        logger.error('Failed to get package name:', error);
        return 'unknown';
    }
}

async function getImportStatements(document: vscode.TextDocument): Promise<string[]> {
    try {
        const text = document.getText();
        const importMatches = text.match(/^\s*import\s+[^;]+;/gm);
        return importMatches || [];
    } catch (error) {
        console.log('Failed to get import statements:', error);
        logger.error('Failed to get import statements:', error);
        return [];
    }
}

async function getProjectDependencies(uri: vscode.Uri): Promise<string | null> {
    try {
        // Try to get project dependency information
        const dependencies = await vscode.commands.executeCommand<any>(
            "java.execute.workspaceCommand", 
            uri.toString()
        );
        
        if (dependencies && Array.isArray(dependencies)) {
            return dependencies.slice(0, 10).map((dep: any) => 
                typeof dep === 'string' ? dep : dep.artifactId || dep.name || 'unknown'
            ).join('\n');
        }
        return null;
    } catch (error) {
        console.log('Failed to get project dependencies:', error);
        logger.error('Failed to get project dependencies:', error);
        return null;
    }
}

async function getCompilerSettings(uri: vscode.Uri): Promise<string | null> {
    const start = performance.now();
    try {
        const settings = await vscode.commands.executeCommand<Record<string, string>>(
            "java.execute.workspaceCommand",
            "java.project.getSettings",
            uri.toString(),
            [
                "org.eclipse.jdt.core.compiler.source",
                "org.eclipse.jdt.core.compiler.compliance",
                "org.eclipse.jdt.core.compiler.codegen.targetPlatform"
            ]
        );

        if (settings) {
            const settingsInfo: string[] = [];
            if (settings["org.eclipse.jdt.core.compiler.source"]) {
                settingsInfo.push(`Source Level: ${settings["org.eclipse.jdt.core.compiler.source"]}`);
            }
            if (settings["org.eclipse.jdt.core.compiler.compliance"]) {
                settingsInfo.push(`Compliance Level: ${settings["org.eclipse.jdt.core.compiler.compliance"]}`);
            }
            if (settings["org.eclipse.jdt.core.compiler.codegen.targetPlatform"]) {
                settingsInfo.push(`Target Platform: ${settings["org.eclipse.jdt.core.compiler.codegen.targetPlatform"]}`);
            }
            return settingsInfo.join('\n');
        }
        return null;
    } catch (error) {
        console.log('Failed to get compiler settings:', error);
        logger.error('Failed to get compiler settings:', error);
        return null;
    }
    finally {
        const duration = performance.now() - start;
        console.log(`getCompilerSettings took ${duration.toFixed(2)} ms`);
        logger.info(`getCompilerSettings took ${duration.toFixed(2)} ms`);
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