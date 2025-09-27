// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { commands, Uri, CancellationToken } from "vscode";
import { logger } from "../utils";
import { validateExtensionInstalled } from "../../recommendation";

export interface INodeImportClass {
    uri: string;
    className: string;  // Changed from 'class' to 'className' to match Java code
}
/**
 * Helper class for Copilot integration to analyze Java project dependencies
 */
export namespace CopilotHelper {
    /**
     * Resolves all local project types imported by the given file
     * @param fileUri The URI of the Java file to analyze
     * @param cancellationToken Optional cancellation token to abort the operation
     * @returns Array of strings in format "type:fully.qualified.name" where type is class|interface|enum|annotation
     */
    export async function resolveLocalImports(fileUri: Uri, cancellationToken?: CancellationToken): Promise<INodeImportClass[]> {
        if (cancellationToken?.isCancellationRequested) {
            return [];
        }
        // Ensure the Java Dependency extension is installed and meets the minimum version requirement.
        if (!await validateExtensionInstalled("vscjava.vscode-java-dependency", "0.26.0")) {
            return [];
        }
        
        if (cancellationToken?.isCancellationRequested) {
            return [];
        }
        
        try {
            // Create a promise that can be cancelled
            const commandPromise = commands.executeCommand("java.execute.workspaceCommand", "java.project.getImportClassContent", fileUri.toString()) as Promise<INodeImportClass[]>;
            
            if (cancellationToken) {
                const result = await Promise.race([
                    commandPromise,
                    new Promise<INodeImportClass[]>((_, reject) => {
                        cancellationToken.onCancellationRequested(() => {
                            reject(new Error('Operation cancelled'));
                        });
                    })
                ]);
                return result || [];
            } else {
                const result = await commandPromise;
                return result || [];
            }
        } catch (error: any) {
            if (error.message === 'Operation cancelled') {
                logger.info('Resolve local imports cancelled');
                return [];
            }
            logger.error("Error resolving copilot request:", error);
            return [];
        }
    }
}
