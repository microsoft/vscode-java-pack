// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import compareVersions from "compare-versions";
import * as vscode from "vscode";
import * as fse from "fs-extra";
import * as path from "path";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";
import { loadTextFromFile } from "../utils";
import { JavaConstants, SupportedSettings, VSCodeSettings } from "./FormatterConstants";
import { FormatterConverter } from "./FormatterConverter";
import { remoteProfileProvider, RemoteProfileProvider } from "./RemoteProfileProvider";
import { SettingModel } from "./SettingModel";
import { ExampleKind } from "./types";
import { addDefaultProfile, downloadFile, getAbsoluteTargetPath, getProfilePath, isRemote, openFormatterSettings } from "./utils";
export class JavaFormatterSettingsEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "java.formatterSettingsEditor";
    private checkedRequirement: boolean = false;
    private checkedProfileSettings: boolean = false;
    private settingsUrl: string | undefined = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
    private webviewPanel: vscode.WebviewPanel | undefined;
    private profilePath: string = "";
    private readOnly: boolean = false;
    private settingModel: SettingModel | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_URL_KEY}`) || e.affectsConfiguration(`java.${JavaConstants.SETTINGS_PROFILE_KEY}`)) {
                this.checkedProfileSettings = false;
                this.onChangeProfileSettings();
            } else if (this.webviewPanel && (e.affectsConfiguration(VSCodeSettings.TAB_SIZE) || e.affectsConfiguration(VSCodeSettings.INSERT_SPACES) || e.affectsConfiguration(VSCodeSettings.DETECT_INDENTATION))) {
                await this.settingModel?.updateVSCodeSettings();
                this.settingModel?.format();
            }
            if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_URL_KEY}`)) {
                this.settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
                if (this.settingsUrl && !isRemote(this.settingsUrl)) {
                    this.profilePath = await getProfilePath(this.settingsUrl);
                }
            }
        });
    }

    public async showFormatterSettingsEditor(): Promise<void> {
        if (this.webviewPanel || !await this.checkProfileSettings() || !this.settingsUrl) {
            return;
        }
        const filePath = this.readOnly ? vscode.Uri.parse(this.settingsUrl).with({ scheme: RemoteProfileProvider.scheme }) : vscode.Uri.file(this.profilePath);
        vscode.commands.executeCommand("vscode.openWith", filePath, "java.formatterSettingsEditor");
    }

    public reopenWithTextEditor(_context: vscode.ExtensionContext, _operationId: string, uri: any) {
        if (uri instanceof vscode.Uri) {
            vscode.commands.executeCommand("vscode.openWith", uri, "default");
        }
    }

    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

        // restrict one webviewpanel only
        if (this.webviewPanel) {
            vscode.commands.executeCommand("vscode.open", document.uri);
            webviewPanel.dispose();
            return;
        } else {
            this.webviewPanel = webviewPanel;
        }

        this.settingModel = new SettingModel(webviewPanel);
        this.webviewPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };
        this.webviewPanel.onDidDispose(() => {
            this.webviewPanel = undefined;
        });
        const resourceUri = this.context.asAbsolutePath("./out/assets/formatter-settings/index.html");
        this.webviewPanel.webview.html = await loadTextFromFile(resourceUri);
        this.webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.command) {
                case "onWillInitialize":
                    if (!await this.initialize(document)) {
                        this.webviewPanel?.dispose();
                    }
                    break;
                case "onWillChangeExampleKind":
                    this.exampleKind = e.exampleKind;
                    this.settingModel?.format();
                    break;
                case "onWillChangeSetting":
                    const settingValue: string | undefined = FormatterConverter.webView2ProfileConvert(e.id, e.value.toString());
                    // "" represents an empty inputbox, we regard it as a valid value.
                    if (settingValue === undefined) {
                        return;
                    }
                    if (SupportedSettings.indentationSettings.includes(e.id)) {
                        const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
                        if (e.id === SupportedSettings.TABULATION_CHAR) {
                            const targetValue = (settingValue === "tab") ? false : true;
                            await config.update(VSCodeSettings.INSERT_SPACES, targetValue, undefined, true);
                        } else if (e.id === SupportedSettings.TABULATION_SIZE) {
                            await config.update(VSCodeSettings.TAB_SIZE, (settingValue === "") ? "" : Number(settingValue), undefined, true);
                        }
                        this.profileSettings.set(e.id, settingValue);
                    } else if (e.id === VSCodeSettings.DETECT_INDENTATION) {
                        const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
                        await config.update(VSCodeSettings.DETECT_INDENTATION, (settingValue === "true"), undefined, true);
                    } else {
                        await this.settingModel?.modifyProfile(e.id, settingValue, document);
                    }
                    break;
                case "onWillDownloadAndUse": {
                    const settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
                    if (!settingsUrl || !isRemote(settingsUrl)) {
                        vscode.window.showErrorMessage("The active formatter profile does not exist or is not remote, please check it in the Settings and try again.",
                            "Open Settings").then((result) => {
                                if (result === "Open Settings") {
                                    openFormatterSettings();
                                }
                            });
                        return;
                    }
                    this.webviewPanel?.dispose();
                    await this.downloadAndUse(settingsUrl);
                    break;
                }
                default:
                    break;
            }
        });
        await this.checkRequirement();
    }

    private async checkRequirement(): Promise<boolean> {
        if (this.checkedRequirement) {
            return true;
        }
        const javaExt = vscode.extensions.getExtension("redhat.java");
        if (!javaExt) {
            vscode.window.showErrorMessage("The extension 'redhat.java' is not installed. Please install it and run this command again.");
            const err: Error = new Error("The extension 'redhat.java' is not installed.");
            setUserError(err);
            sendError(err);
            return false;
        }
        const javaExtVersion: string = javaExt.packageJSON.version;
        if (compareVersions(javaExtVersion, JavaConstants.MINIMUM_JAVA_EXTENSION_VERSION) < 0) {
            vscode.window.showErrorMessage(`The extension version of 'redhat.java' is too stale. Please install at least ${JavaConstants.MINIMUM_JAVA_EXTENSION_VERSION} and run this command again.`);
            const err: Error = new Error(`The extension version of 'redhat.java' (${javaExtVersion}) is too stale.`);
            setUserError(err);
            sendError(err);
            return false;
        }
        await javaExt.activate();
        this.checkedRequirement = true;
        return true;
    }

    private async initialize(document: vscode.TextDocument): Promise<boolean> {
        if (!await this.checkRequirement() || !await this.checkProfileSettings() || !await this.settingModel?.parseProfileAndUpdate(document)) {
            return false;
        }
        this.exampleKind = ExampleKind.INDENTATION_EXAMPLE;
        this.webviewPanel?.webview.postMessage({
            command: "changeReadOnlyState",
            value: this.readOnly,
        });
        return true;
    }

    private onChangeProfileSettings(): void {
        if (this.webviewPanel?.visible) {
            vscode.window.showInformationMessage(`Formatter Profile settings have been changed, do you want to reload this editor?`,
                "Yes", "No").then(async (result) => {
                    if (result === "Yes") {
                        vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
                    }
                });
        }
    }

    private async downloadAndUse(settingsUrl: string): Promise<boolean> {
        const profilePath = await getAbsoluteTargetPath(this.context, path.basename(settingsUrl));
        const data = await downloadFile(settingsUrl);
        if (!data) {
            return false;
        }
        await fse.outputFile(profilePath, data);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        await vscode.workspace.getConfiguration("java").update("format.settings.url", (workspaceFolders?.length ? vscode.workspace.asRelativePath(profilePath) : profilePath), !(workspaceFolders?.length));
        this.showFormatterSettingsEditor();
        return true;
    }

    private checkProfileSettings = instrumentOperation("formatter.checkProfileSetting", async (operationId: string) => {
        if (this.checkedProfileSettings) {
            return true;
        }
        this.readOnly = false;
        if (!this.settingsUrl) {
            sendInfo(operationId, { formatterProfile: "undefined" });
            await vscode.window.showInformationMessage("No active Formatter Profile found, do you want to create a default one?",
                "Yes", "No").then((result) => {
                    if (result === "Yes") {
                        addDefaultProfile(this.context);
                    }
                });
        } else if (isRemote(this.settingsUrl)) {
            sendInfo(operationId, { formatterProfile: "remote" });
            this.checkedProfileSettings = await vscode.window.showInformationMessage("The active formatter profile is remote, do you want to open it in read-only mode or download and use it locally?",
                "Open in read-only mode", "Download and use it locally").then(async (result) => {
                    if (result === "Open in read-only mode") {
                        const content = await downloadFile(this.settingsUrl!);
                        if (!content) {
                            return false;
                        }
                        remoteProfileProvider.setContent(this.settingsUrl!, content);
                        this.readOnly = true;
                        return true;
                    } else if (result === "Download and use it locally") {
                        this.downloadAndUse(this.settingsUrl!);
                        return false;
                    } else {
                        return false;
                    }
                });
        } else {
            if (!this.profilePath) {
                this.profilePath = await getProfilePath(this.settingsUrl);
            }
            if (!(await fse.pathExists(this.profilePath))) {
                sendInfo(operationId, { formatterProfile: "notExist" });
                await vscode.window.showInformationMessage("The active formatter profile does not exist, please check it in the Settings and try again.",
                    "Open Settings", "Generate a default profile").then((result) => {
                        if (result === "Open Settings") {
                            openFormatterSettings();
                        } else if (result === "Generate a default profile") {
                            addDefaultProfile(this.context);
                        }
                    });
                return false;
            }
            sendInfo(operationId, { formatterProfile: "valid" });
            this.checkedProfileSettings = true;
        }
        return this.checkedProfileSettings;
    });
}

export let javaFormatterSettingsEditorProvider: JavaFormatterSettingsEditorProvider;

export function initFormatterSettingsEditorProvider(context: vscode.ExtensionContext) {
    javaFormatterSettingsEditorProvider = new JavaFormatterSettingsEditorProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider(JavaFormatterSettingsEditorProvider.viewType, javaFormatterSettingsEditorProvider, { webviewOptions: { enableFindWidget: true, retainContextWhenHidden: true } }));
}
