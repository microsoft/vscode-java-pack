// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";

const ADD_VARIABlLE_ATTRIBUTE = "org.eclipse.jdt.core.compiler.debug.localVariable";
const ADD_LINE_NUMBER_ATTRIBUTE = "org.eclipse.jdt.core.compiler.debug.lineNumber";
const ADD_SOURCE_FILE_NAME = "org.eclipse.jdt.core.compiler.debug.sourceFile";
const STORE_METHOD_PARAMETER_INFO = "org.eclipse.jdt.core.compiler.codegen.methodParameters";
const ENABLE_PREVIEW_FEATURES = "org.eclipse.jdt.core.compiler.problem.enablePreviewFeatures";
const USE_RELEASE = "org.eclipse.jdt.core.compiler.release";
const SOURCE_COMPATIBILITY = "org.eclipse.jdt.core.compiler.source";
const TARGET_COMPATIBILITY = "org.eclipse.jdt.core.compiler.codegen.targetPlatform";
const COMPLIANCE_LEVEL = "org.eclipse.jdt.core.compiler.compliance";

export class CompilerRequestHandler implements vscode.Disposable {
    private webview: vscode.Webview;
    private disposables: vscode.Disposable[] = [];

    constructor(webview: vscode.Webview) {
        this.webview = webview;
        this.disposables.push(this.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "compiler.onWillGetAvailableComplianceLevels":
                    this.onWillGetAvailableComplianceLevels();
                    break;
                case "compiler.onWillGetCompilerSettings":
                    this.onWillGetCompilerSettings(message.uri);
                    break;
                case "compiler.onWillUpdateCompilerSettings":
                    this.onWillUpdateCompilerSettings(message.uri, message.useRelease, message.enablePreview, message.complianceLevel,
                            message.sourceLevel, message.targetLevel, message.generateDebugInfo, message.storeMethodParamNames);
                    break;
                default:
                    break;
            }
        }));
    }

    private onWillGetAvailableComplianceLevels = instrumentOperation("projectSettings.compiler.onWillGetAvailableComplianceLevels", async (_operationId: string): Promise<void> => {
        const jres = this.getRuntimeDefinition().items?.properties?.name?.enum;
        if (jres) {
            this.webview.postMessage({
                command: "compiler.onDidGetAvailableComplianceLevels",
                complianceLevels: jres.map((jre: string) => jre.substring(jre.lastIndexOf("-") + 1)),
            });
        }
    });

    private onWillGetCompilerSettings = instrumentOperation("projectSettings.compiler.onWillGetCompilerSettings", async (_operationId: string, uri: string): Promise<void> => {
        const response: any = await vscode.commands.executeCommand<Object>("java.execute.workspaceCommand",
                "java.project.getSettings", uri, [
                    ADD_VARIABlLE_ATTRIBUTE,
                    ADD_LINE_NUMBER_ATTRIBUTE,
                    ADD_SOURCE_FILE_NAME,
                    STORE_METHOD_PARAMETER_INFO,
                    ENABLE_PREVIEW_FEATURES,
                    USE_RELEASE,
                    SOURCE_COMPATIBILITY,
                    TARGET_COMPATIBILITY,
                    COMPLIANCE_LEVEL
                ]);
        this.webview.postMessage({
            command: "compiler.onDidGetCompilerSettings",
            useRelease: response?.[USE_RELEASE] === "enabled",
            enablePreview: response?.[ENABLE_PREVIEW_FEATURES] === "enabled",
            complianceLevel: response?.[COMPLIANCE_LEVEL],
            sourceLevel: response?.[SOURCE_COMPATIBILITY],
            targetLevel: response?.[TARGET_COMPATIBILITY],
            generateDebugInfo: response?.[ADD_VARIABlLE_ATTRIBUTE] === "generate" &&
                    response?.[ADD_LINE_NUMBER_ATTRIBUTE] === "generate" &&
                    response?.[ADD_SOURCE_FILE_NAME] === "generate",
            storeMethodParamNames: response?.[STORE_METHOD_PARAMETER_INFO] === "generate",
        });
    });

    private onWillUpdateCompilerSettings = instrumentOperation("projectSettings.compiler.onWillUpdateCompilerSettings", async (operationId: string,
            uri: string, useRelease: boolean, enablePreview: boolean, complianceLevel: string, sourceLevel: string, targetLevel: string,
            generateDebugInfo: boolean, storeMethodParamNames: boolean): Promise<void> => {
        const compilerSettings: Map<string, string> = new Map<string, string>();
        compilerSettings.set(USE_RELEASE, useRelease ? "enabled" : "disabled");
        if (useRelease) {
            // if useRelease is enabled, source and target level should honor the compliance level.
            compilerSettings.set(COMPLIANCE_LEVEL, complianceLevel);
            compilerSettings.set(SOURCE_COMPATIBILITY, complianceLevel);
            compilerSettings.set(TARGET_COMPATIBILITY, complianceLevel);
        } else {
            // if useRelease is disabled, compliance level should be the same as target level.
            compilerSettings.set(COMPLIANCE_LEVEL, targetLevel);
            compilerSettings.set(SOURCE_COMPATIBILITY, sourceLevel);
            compilerSettings.set(TARGET_COMPATIBILITY, targetLevel);
        }
        compilerSettings.set(ENABLE_PREVIEW_FEATURES, enablePreview ? "enabled" : "disabled");
        compilerSettings.set(ADD_VARIABlLE_ATTRIBUTE, generateDebugInfo ? "generate" : "do not generate");
        compilerSettings.set(ADD_LINE_NUMBER_ATTRIBUTE, generateDebugInfo ? "generate" : "do not generate");
        compilerSettings.set(ADD_SOURCE_FILE_NAME, generateDebugInfo ? "generate" : "do not generate");
        compilerSettings.set(STORE_METHOD_PARAMETER_INFO, storeMethodParamNames ? "generate" : "do not generate");

        await vscode.commands.executeCommand("java.execute.workspaceCommand",
            "java.project.updateSettings", uri, JSON.stringify([...compilerSettings]));

        // Update the version according to the result.
        this.webview.postMessage({
            command: "compiler.onDidGetCompilerSettings",
            complianceLevel: compilerSettings.get(COMPLIANCE_LEVEL),
            sourceLevel: compilerSettings.get(SOURCE_COMPATIBILITY),
            targetLevel: compilerSettings.get(TARGET_COMPATIBILITY),
        });

        sendInfo(operationId, {
            operationName: "projectSettings.updateCompilerSettings",
            // remove the common prefix to reduce the payload.
            arg: JSON.stringify([...compilerSettings]).replace(/org\.eclipse\.jdt\.core\.compiler\./g, ""),
        });
    });

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }

    /**
     * Get the java runtime definitions from the java extension manifest.
     */
    private getRuntimeDefinition() {
        const packageJson = vscode.extensions.getExtension("redhat.java")?.packageJSON;
        if (!packageJson) {
            const errorString = "The required extension 'redhat.java' is not installed.";
            vscode.window.showErrorMessage(errorString);
            const err: Error = new Error(errorString);
            setUserError(err);
            sendError(err);
            return;
        }

        // contributes.configuration can either be a single object,
        // representing a single category of settings, or an array
        // of objects, representing multiple categories of settings.
        const categories = packageJson?.contributes?.configuration;
        if (Array.isArray(categories)) {
            for (const category of categories) {
                if (category?.properties?.["java.configuration.runtimes"]) {
                    return category.properties["java.configuration.runtimes"];
                }
            }
        } else {
            return categories?.properties?.["java.configuration.runtimes"];
        } 
    }
}
