// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { commands, Uri } from "vscode";
import { logger } from "../utils";
import { validateAndRecommendExtension } from "../../recommendation";

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
     * @returns Array of strings in format "type:fully.qualified.name" where type is class|interface|enum|annotation
     */
    export async function resolveLocalImports(fileUri: Uri): Promise<INodeImportClass[]> {
        if (!await validateAndRecommendExtension("vscjava.vscode-java-dependency", "Project Manager for Java extension is recommended to provide additional Java project explorer features.", true)) {
            return [];
        }
        try {
            return await commands.executeCommand("java.execute.workspaceCommand", "java.project.getImportClassContent", fileUri.toString()) || [];
        } catch (error) {
            logger.error("Error resolving copilot request:", error);
            return [];
        }
    }
}
