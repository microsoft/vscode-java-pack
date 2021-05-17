// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { loadTextFromFile } from "../utils";
import { Example, getSupportedProfileSettings, getSupportedVSCodeSettings, JavaConstants } from "./FormatterConstants";
import { ExampleKind, JavaFormatterSetting } from "./types";
export class JavaFormatterSettingsEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "java.formatterSettingsEditor";
    private exampleKind: ExampleKind = ExampleKind.INDENTATION_EXAMPLE;
    private supportedProfileSettings: Map<string, JavaFormatterSetting> = getSupportedProfileSettings(20);
    private supportedVSCodeSettings: Map<string, JavaFormatterSetting> = getSupportedVSCodeSettings();

    constructor(private readonly context: vscode.ExtensionContext) {
    }

    public async showFormatterSettingsEditor() {
        // Use a fake profile
        const defaultProfile: string = path.join(this.context.extensionPath, "webview-resources", "java-formatter.xml");
        const resource = vscode.Uri.file(defaultProfile);
        vscode.commands.executeCommand("vscode.openWith", resource, "java.formatterSettingsEditor");
    }

    public async resolveCustomTextEditor(_document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };
        const resourceUri = this.context.asAbsolutePath("./out/assets/formatter-settings/index.html");
        webviewPanel.webview.html = await loadTextFromFile(resourceUri);
        this.exampleKind = ExampleKind.INDENTATION_EXAMPLE;
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.command) {
                case "onWillInitialize":
                    // use default values temporarily
                    webviewPanel.webview.postMessage({
                        command: "loadProfileSetting",
                        setting: Array.from(this.supportedProfileSettings.values()),
                    });
                    webviewPanel.webview.postMessage({
                        command: "loadVSCodeSetting",
                        setting: Array.from(this.supportedVSCodeSettings.values()),
                    });
                    this.formatWithProfileSettings(webviewPanel);
                    break;
                case "onWillChangeExampleKind":
                    this.exampleKind = e.exampleKind;
                    this.formatWithProfileSettings(webviewPanel);
                    break;
                case "onWillChangeSetting":
                    // modify the settings in memory temporarily
                    for (const entry of this.supportedProfileSettings.entries()) {
                        if (entry[0] === e.id) {
                            entry[1].value = e.value;
                            break;
                        }
                    }
                    for (const entry of this.supportedVSCodeSettings.entries()) {
                        if (entry[0] === e.id) {
                            entry[1].value = e.value;
                            break;
                        }
                    }
                    webviewPanel.webview.postMessage({
                        command: "loadProfileSetting",
                        setting: Array.from(this.supportedProfileSettings.values()),
                    });
                    webviewPanel.webview.postMessage({
                        command: "loadVSCodeSetting",
                        setting: Array.from(this.supportedVSCodeSettings.values()),
                    });
                    break;
                default:
                    break;
            }
        });
    }

    private async formatWithProfileSettings(webviewPanel: vscode.WebviewPanel) {
        // use default settings temporarily
        const content = await vscode.commands.executeCommand<string>("java.execute.workspaceCommand", "java.edit.stringFormatting", Example.getExample(this.exampleKind), JSON.stringify([]), JavaConstants.CURRENT_FORMATTER_SETTINGS_VERSION);
        if (webviewPanel && webviewPanel.webview) {
            webviewPanel.webview.postMessage({
                command: "formattedContent",
                content: content,
            });
        }
    }
}

export let javaFormatterSettingsEditorProvider: JavaFormatterSettingsEditorProvider;

export function initFormatterSettingsEditorProvider(context: vscode.ExtensionContext) {
    javaFormatterSettingsEditorProvider = new JavaFormatterSettingsEditorProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider(JavaFormatterSettingsEditorProvider.viewType, javaFormatterSettingsEditorProvider, { webviewOptions: {enableFindWidget: true, retainContextWhenHidden: true}}));
}
