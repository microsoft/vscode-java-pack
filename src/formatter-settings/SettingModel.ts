// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { Example, getSupportedVSCodeSettings, JavaConstants, SupportedSettings, VSCodeSettings } from "./FormatterConstants";
import { DOMElement, ExampleKind, ProfileContent } from "./types";
import { addDefaultProfile, downloadFile, getAbsoluteTargetPath, getVSCodeSetting, isRemote, openFormatterSettings, parseProfile } from "./utils";

export class SettingModel {
    
    private exampleKind: ExampleKind = ExampleKind.INDENTATION_EXAMPLE;
    private settingsVersion: string = JavaConstants.CURRENT_FORMATTER_SETTINGS_VERSION;
    private profileElements: Map<string, DOMElement> = new Map<string, DOMElement>();
    private profileSettings: Map<string, string> = new Map<string, string>();
    private lastElement: DOMElement | undefined;
    private diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection();
    private webviewPanel: vscode.WebviewPanel;

    constructor(webviewPanel: vscode.WebviewPanel) {
        this.webviewPanel = webviewPanel;
        vscode.workspace.onDidChangeTextDocument(async (e: vscode.TextDocumentChangeEvent) => {
            if (!this.settingsUrl || e.document.uri.toString() !== vscode.Uri.file(this.profilePath).toString()) {
                return;
            }
            if (!await this.parseProfileAndUpdate(e.document)) {
                this.webviewPanel?.dispose();
            }
        });
    }

    public async parseProfileAndUpdate(document: vscode.TextDocument): Promise<boolean> {
        const content: ProfileContent = parseProfile(document);
        if (!content.isValid) {
            vscode.window.showErrorMessage("The current profile is invalid, please check it in the Settings and try again.", "Open Settings").then((anwser) => {
                if (anwser === "Open Settings") {
                    openFormatterSettings();
                }
            })
            return false;
        }
        this.diagnosticCollection.set(document.uri, content.diagnostics);
        if (this.webviewPanel) {
            this.profileElements = content.profileElements || this.profileElements;
            this.profileSettings = content.profileSettings || this.profileSettings;
            this.lastElement = content.lastElement || this.lastElement;
            this.settingsVersion = content.settingsVersion;
            if (content.supportedProfileSettings) {
                this.webviewPanel.webview.postMessage({
                    command: "loadProfileSetting",
                    setting: Array.from(content.supportedProfileSettings.values()),
                });
            }
            await this.updateVSCodeSettings();
            this.format();
        }
        return true;
    }

    public async updateVSCodeSettings(): Promise<void> {
        const supportedVSCodeSettings = getSupportedVSCodeSettings();
        for (const setting of supportedVSCodeSettings.values()) {
            switch (setting.id) {
                case SupportedSettings.TABULATION_CHAR:
                    setting.value = (await getVSCodeSetting(VSCodeSettings.INSERT_SPACES, true) === false) ? "tab" : "space";
                    this.profileSettings.set(setting.id, setting.value);
                    break;
                case SupportedSettings.TABULATION_SIZE:
                    setting.value = String(await getVSCodeSetting(VSCodeSettings.TAB_SIZE, 4));
                    this.profileSettings.set(setting.id, setting.value);
                    break;
                case VSCodeSettings.DETECT_INDENTATION:
                    setting.value = String(await getVSCodeSetting(VSCodeSettings.DETECT_INDENTATION, true));
                    break;
                default:
                    return;
            }
        }
        this.webviewPanel?.webview.postMessage({
            command: "loadVSCodeSetting",
            setting: Array.from(supportedVSCodeSettings.values()),
        });
    }

    public async modifyProfile(id: string, value: string, document: vscode.TextDocument): Promise<void> {
        const profileElement = this.profileElements.get(id);
        if (!profileElement) {
            // add a new setting not exist in the profile
            if (!this.lastElement) {
                return;
            }
            const cloneElement = this.lastElement.cloneNode() as DOMElement;
            const originalString: string = new XMLSerializer().serializeToString(cloneElement);
            cloneElement.setAttribute("id", id);
            cloneElement.setAttribute("value", value);
            const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, new vscode.Position(cloneElement.lineNumber - 1, cloneElement.columnNumber - 1 + originalString.length), ((document.eol === vscode.EndOfLine.LF) ? "\n" : "\r\n") + " ".repeat(cloneElement.columnNumber - 1) + new XMLSerializer().serializeToString(cloneElement));
            await vscode.workspace.applyEdit(edit);
        } else {
            // edit a current setting in the profile
            const originalSetting: string = new XMLSerializer().serializeToString(profileElement);
            profileElement.setAttribute("value", value);
            const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(new vscode.Position(profileElement.lineNumber - 1, profileElement.columnNumber - 1), new vscode.Position(profileElement.lineNumber - 1, profileElement.columnNumber - 1 + originalSetting.length)), new XMLSerializer().serializeToString(profileElement));
            await vscode.workspace.applyEdit(edit);
        }
    }

    public async format(): Promise<void> {
        const content = await vscode.commands.executeCommand<string>("java.execute.workspaceCommand", "java.edit.stringFormatting", Example.getExample(this.exampleKind), JSON.stringify([...this.profileSettings]), this.settingsVersion);
        if (this.webviewPanel?.webview) {
            this.webviewPanel.webview.postMessage({
                command: "formattedContent",
                content: content,
            });
        }
    }
}
