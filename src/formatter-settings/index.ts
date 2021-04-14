// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { formatterConverter } from "./assets/features/formatterSettings/FormatterConverter";
import * as xml2js from "xml2js";
import { Catagory, JavaConstants, PreviewExample, SupportedSettings } from "./FormatterConstants";

export class JavaFormatterSettingsEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "java.formatterSettingsEditor";

    private settings: Map<string, string>;
    private settingsVersion: string;
    private settingsUrl: string | undefined;
    private settingsProfile: string | undefined;
    private content: string;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.settings = new Map<string, string>();
        this.settingsVersion = JavaConstants.JAVA_FORMATTER_SETTINGS_VERSION;
        this.settings.set("org.eclipse.jdt.core.formatter.blank_lines_after_package", "3");
        this.settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
        this.settingsProfile = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_PROFILE_KEY);
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_URL_KEY}`)) {
                this.settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
            } else if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_PROFILE_KEY}`)) {
                this.settingsProfile = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_PROFILE_KEY);
            }
        }));
        this.content = PreviewExample.COMMON_EXAMPLE;
    }

    public async showFormatterSettingsEditor() {
        if (!this.settingsUrl) {
            vscode.window.showInformationMessage("No available Java Formatter Profile in the workspace, do you want to use a new profile?",
                "Yes", "No").then(async (messageResult) => {
                    if (messageResult === "Yes") {
                        vscode.commands.executeCommand(JavaConstants.OPEN_FORMATTER);
                    } else {
                        return;
                    }
                });
        } else {
            const profilePath = this.getPath(this.settingsUrl);
            if (!profilePath) {
                return;
            }
            const resource = vscode.Uri.file(profilePath);
            vscode.commands.executeCommand("vscode.openWith", resource, "java.formatterSettingsEditor");
        }
    }

    private getPath(formatterUrl: string): string | undefined {
        if (!vscode.workspace.workspaceFolders) {
            return undefined;
        }
        if (!path.isAbsolute(formatterUrl)) {
            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                const file = path.resolve(workspaceFolder.uri.fsPath, formatterUrl);
                if (fs.existsSync(file)) {
                    return file;
                }
            }
        } else {
            return path.resolve(formatterUrl);
        }
        return undefined;
    }

    private async loadFormatterSettings(document: vscode.TextDocument) {
        const text: string = document.getText();
        if (text.trim().length === 0) {
            return;
        }
        try {
            const result = await xml2js.parseStringPromise(text);
            this.settingsVersion = result.profiles.$.version;
            for (const profile of result.profiles.profile) {
                if (!this.settingsProfile || this.settingsProfile === profile.$.name) {
                    for (const setting of profile.setting) {
                        this.settings.set(setting.$.id, setting.$.value);
                    }
                }
            }
        } catch (e) {
            throw new Error(e);
        }
    }

    private async applyFormatterSettings(document: vscode.TextDocument) {
        const text: string = document.getText();
        if (text.trim().length === 0) {
            return;
        }
        const options = {
            xmldec: {
                version: "1.0",
                encoding: "UTF-8",
                standalone: false,
            }
        };
        const builder = new xml2js.Builder(options);
        try {
            const result = await xml2js.parseStringPromise(text);
            for (const profile of result.profiles.profile) {
                if (!this.settingsProfile || this.settingsProfile === profile.$.name) {
                    for (const setting of profile.setting) {
                        setting.$.value = this.settings.get(setting.$.id);
                    }
                }
            }
            const profile = builder.buildObject(result);
            const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0)), profile);
            vscode.workspace.applyEdit(edit);
        } catch (e) {
            throw new Error(e);
        }
    }

    private findJavaSpecificSetting(setting: string): string | boolean | number | undefined {
        const config = vscode.workspace.getConfiguration().get<Object>("[java]");
        if (!config) {
            return undefined;
        }
        const entries = Object.entries(config);
        let result: string | boolean | number | undefined;
        for (const entry of entries) {
            if (entry[0] === setting) {
                result = entry[1];
            }
        }
        return result;
    }

    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };
        const resourceUri = this.context.asAbsolutePath("./out/assets/formatter-settings/index.html");
        const buffer: string = fs.readFileSync(resourceUri).toString();
        webviewPanel.webview.html = buffer;

        await this.loadFormatterSettings(document);
        webviewPanel.webview.postMessage({
            command: "VSCodeToWebview.initVersion",
            version: this.settingsVersion,
        });
        for (const entry of this.settings.entries()) {
            if (SupportedSettings.settings.includes(entry[0])) {
                webviewPanel.webview.postMessage({
                    command: "VSCodeToWebview.initSetting",
                    id: entry[0],
                    value: entry[1],
                });
            }
        }

        const javaTabSize = this.findJavaSpecificSetting("editor.tabSize");
        const javaTabPolicy = this.findJavaSpecificSetting("editor.insertSpaces");
        const tabSize = vscode.workspace.getConfiguration().get<number>("editor.tabSize");
        const tabPolicy = vscode.workspace.getConfiguration().get<boolean>("editor.insertSpaces");

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.command) {
                case "WebviewToVSCode.changeActiveCatagory": {
                    switch (e.catagory) {
                        case Catagory.Blankline:
                            this.content = PreviewExample.BLANKLINE_EXAMPLE;
                            break;
                        case Catagory.Comment:
                            this.content = PreviewExample.COMMENT_EXAMPLE;
                            break;
                        case Catagory.Common:
                            this.content = PreviewExample.COMMON_EXAMPLE;
                            break;
                        case Catagory.Newline:
                            this.content = PreviewExample.NEWLINE_EXAMPLE;
                            break;
                        case Catagory.Whitespace:
                            this.content = PreviewExample.WHITESPACE_EXAMPLE;
                            break;
                        case Catagory.Wrapping:
                            this.content = PreviewExample.WRAPPING_EXAMPLE;
                            break;
                        default:
                            this.content = PreviewExample.COMMON_EXAMPLE;
                            break;
                    }
                    break;
                }
                case "WebviewToVSCode.changeSetting": {
                    const settingValue: string = formatterConverter.valueConvert(e.id, e.value.toString());
                    if (!settingValue) {
                        return;
                    }
                    this.settings.set(e.id, settingValue);
                    const content = await vscode.commands.executeCommand<string>("java.execute.workspaceCommand", "java.edit.stringFormatting", this.content, JSON.stringify([...this.settings]), this.settingsVersion);
                    webviewPanel.webview.postMessage({
                        command: "VSCodeToWebview.formattedCode",
                        content: content,
                    });
                    break;
                }
                case "WebviewToVSCode.applyChanges": {
                    this.applyFormatterSettings(document);
                    break;
                }
                default:
                    break;
            }
        });

    }

}
