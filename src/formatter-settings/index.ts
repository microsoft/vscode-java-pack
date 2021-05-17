// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import compareVersions from "compare-versions";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";
import { DOMParser, XMLSerializer } from "xmldom";
import { loadTextFromFile } from "../utils";
import { Example, getDefaultValue, getSupportedProfileSettings, getSupportedVSCodeSettings, JavaConstants, SupportedSettings, VSCodeSettings } from "./FormatterConstants";
import { FormatterConverter } from "./FormatterConverter";
import { DOMElement, ExampleKind, JavaFormatterSetting } from "./types";
import { getProfilePath, getVSCodeSetting, isRemote, getTargetProfilePath } from "./utils";
export class JavaFormatterSettingsEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "java.formatterSettingsEditor";
    private exampleKind: ExampleKind = ExampleKind.INDENTATION_EXAMPLE;
    private supportedProfileSettings: Map<string, JavaFormatterSetting> = getSupportedProfileSettings(20);
    private supportedVSCodeSettings: Map<string, JavaFormatterSetting> = getSupportedVSCodeSettings();
    private profileElements: Map<string, DOMElement> = new Map<string, DOMElement>();
    private profileSettings: Map<string, string> = new Map<string, string>();
    private lastElement: DOMElement | undefined;
    private settingsVersion: string = JavaConstants.CURRENT_FORMATTER_SETTINGS_VERSION;
    private checkedRequirement: boolean = false;
    private checkedProfile: boolean = false;
    private diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection();

    constructor(private readonly context: vscode.ExtensionContext) {
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_URL_KEY}`) || e.affectsConfiguration(`java.${JavaConstants.SETTINGS_PROFILE_KEY}`)) {
                this.checkedProfile = false;
            }
        });
    }

    public async showFormatterSettingsEditor(): Promise<void> {
        if (!await this.checkProfile()) {
            return;
        }
        const settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
        if (!settingsUrl) {
            return;
        }
        const filePath = vscode.Uri.file(await getProfilePath(settingsUrl));
        vscode.commands.executeCommand("vscode.openWith", filePath, "java.formatterSettingsEditor");
    }

    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

        webviewPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        };
        const resourceUri = this.context.asAbsolutePath("./out/assets/formatter-settings/index.html");
        webviewPanel.webview.html = await loadTextFromFile(resourceUri);
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e: vscode.TextDocumentChangeEvent) => {
            if (e.document.uri.toString() !== document.uri.toString()) {
                return;
            }
            const diagnostics = this.updateProfileSettings(e.document, webviewPanel);
            this.diagnosticCollection.set(e.document.uri, diagnostics);
            await this.updateVSCodeSettings(webviewPanel);
            this.format(webviewPanel);
        });
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.command) {
                case "onWillInitialize":
                    if (!await this.initialize(document, webviewPanel)) {
                        webviewPanel.dispose();
                    }
                    break;
                case "onWillChangeExampleKind":
                    this.exampleKind = e.exampleKind;
                    this.format(webviewPanel);
                    break;
                case "onWillChangeSetting":
                    const settingValue: string | undefined = FormatterConverter.webView2ProfileConvert(e.id, e.value.toString());
                    if (!settingValue) {
                        return;
                    }
                    if (SupportedSettings.indentationSettings.includes(e.id)) {
                        const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
                        if (e.id === SupportedSettings.TABULATION_CHAR) {
                            const targetValue = (settingValue === "tab") ? false : true;
                            await config.update(VSCodeSettings.INSERT_SPACES, targetValue, undefined, true);
                        } else if (e.id === SupportedSettings.TABULATION_SIZE) {
                            await config.update(VSCodeSettings.TAB_SIZE, Number(settingValue), undefined, true);
                        }
                        this.profileSettings.set(e.id, settingValue);
                    } else if (e.id === VSCodeSettings.DETECT_INDENTATION) {
                        const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
                        await config.update(VSCodeSettings.DETECT_INDENTATION, (settingValue === "true"), undefined, true);
                    } else {
                        await this.modifyProfile(e.id, settingValue, document);
                    }
                    break;
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

    private async initialize(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<boolean> {
        if (!await this.checkRequirement()) {
            return false;
        }
        if (!await this.checkProfile()) {
            return false;
        }
        this.exampleKind = ExampleKind.INDENTATION_EXAMPLE;
        const onDidChangeSetting: vscode.Disposable = vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration(`java.${JavaConstants.SETTINGS_URL_KEY}`) || e.affectsConfiguration(`java.${JavaConstants.SETTINGS_PROFILE_KEY}`)) {
                this.onChangeProfile(webviewPanel);
            } else if (e.affectsConfiguration(VSCodeSettings.TAB_SIZE) || e.affectsConfiguration(VSCodeSettings.INSERT_SPACES) || e.affectsConfiguration(VSCodeSettings.DETECT_INDENTATION)) {
                await this.updateVSCodeSettings(webviewPanel);
                this.format(webviewPanel);
            }
        });
        webviewPanel.onDidDispose(() => {
            onDidChangeSetting.dispose();
        });
        const diagnostics = this.updateProfileSettings(document, webviewPanel);
        this.diagnosticCollection.set(document.uri, diagnostics);
        await this.updateVSCodeSettings(webviewPanel);
        this.format(webviewPanel);
        return true;
    }

    private onChangeProfile(webviewPanel: vscode.WebviewPanel): void {
        if (webviewPanel.visible) {
            vscode.window.showInformationMessage(`Formatter Profile settings have been changed, do you want to reload this editor?`,
                "Yes", "No").then(async (result) => {
                    if (result === "Yes") {
                        vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
                    }
                });
        }
    }

    private updateProfileSettings(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): vscode.Diagnostic[] {
        this.profileElements.clear();
        this.profileSettings.clear();
        this.lastElement = undefined;
        this.diagnosticCollection.clear();
        const diagnostics: vscode.Diagnostic[] = [];
        const documentDOM = new DOMParser().parseFromString(document.getText());
        this.settingsVersion = documentDOM.documentElement.getAttribute("version") || this.settingsVersion;
        const profiles = documentDOM.documentElement.getElementsByTagName("profile");
        if (!profiles || profiles.length === 0) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), "No valid profiles found."));
            return diagnostics;
        }
        const settingsProfileName: string | undefined = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_PROFILE_KEY);
        for (let i = 0; i < profiles.length; i++) {
            if (!settingsProfileName || settingsProfileName === profiles[i].getAttribute("name")) {
                if (profiles[i].getAttribute("kind") !== "CodeFormatterProfile") {
                    continue;
                }
                this.settingsVersion = profiles[i].getAttribute("version") || this.settingsVersion;
                const settings = profiles[i].getElementsByTagName("setting");
                for (let j = 0; j < settings.length; j++) {
                    const setting: DOMElement = settings[j] as DOMElement;
                    const settingContent: string = new XMLSerializer().serializeToString(setting);
                    const id = setting.getAttribute("id");
                    if (!id) {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no 'id' property.", vscode.DiagnosticSeverity.Error));
                        continue;
                    }
                    const value = settings[j].getAttribute("value");
                    if (!value) {
                        diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no 'value' property.", vscode.DiagnosticSeverity.Error));
                        continue;
                    }
                    this.profileElements.set(id, setting);
                    this.profileSettings.set(id, value);
                    this.lastElement = setting;
                }
                break;
            }
        }
        if (!this.profileElements.size) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), "No valid settings found in the profile."));
            return diagnostics;
        }
        this.supportedProfileSettings = getSupportedProfileSettings(Number(this.settingsVersion));
        for (const setting of this.supportedProfileSettings.values()) {
            const element = this.profileElements.get(setting.id);
            const value = this.profileSettings.get(setting.id);
            if (!element || !value) {
                continue;
            }
            const webViewValue: string | undefined = FormatterConverter.profile2WebViewConvert(setting.id, value);
            if (!webViewValue) {
                const elementContent = new XMLSerializer().serializeToString(element);
                const elementRange = new vscode.Range(new vscode.Position(element.lineNumber - 1, element.columnNumber - 1), new vscode.Position(element.lineNumber - 1, element.columnNumber - 1 + elementContent.length));
                diagnostics.push(new vscode.Diagnostic(elementRange, `Invalid value in id: "${setting.id}", "${value}" is not supported.`, vscode.DiagnosticSeverity.Error));
                this.profileSettings.delete(setting.id);
                setting.value = FormatterConverter.profile2WebViewConvert(setting.id, getDefaultValue(setting.id))!;
                continue;
            }
            setting.value = webViewValue;
        }
        webviewPanel.webview.postMessage({
            command: "loadProfileSetting",
            setting: Array.from(this.supportedProfileSettings.values()),
        });
        return diagnostics;
    }

    private async updateVSCodeSettings(webviewPanel: vscode.WebviewPanel): Promise<void> {
        this.supportedVSCodeSettings = getSupportedVSCodeSettings();
        for (const setting of this.supportedVSCodeSettings.values()) {
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
        webviewPanel.webview.postMessage({
            command: "loadVSCodeSetting",
            setting: Array.from(this.supportedVSCodeSettings.values()),
        });
    }

    private async format(webviewPanel: vscode.WebviewPanel): Promise<void> {
        const content = await vscode.commands.executeCommand<string>("java.execute.workspaceCommand", "java.edit.stringFormatting", Example.getExample(this.exampleKind), JSON.stringify([...this.profileSettings]), this.settingsVersion);
        if (webviewPanel && webviewPanel.webview) {
            webviewPanel.webview.postMessage({
                command: "formattedContent",
                content: content,
            });
        }
    }

    private async modifyProfile(id: string, value: string, document: vscode.TextDocument): Promise<void> {
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
            vscode.workspace.applyEdit(edit);
        } else {
            // edit a current setting in the profile
            const originalSetting: string = new XMLSerializer().serializeToString(profileElement);
            profileElement.setAttribute("value", value);
            const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(new vscode.Position(profileElement.lineNumber - 1, profileElement.columnNumber - 1), new vscode.Position(profileElement.lineNumber - 1, profileElement.columnNumber - 1 + originalSetting.length)), new XMLSerializer().serializeToString(profileElement));
            vscode.workspace.applyEdit(edit);
        }
    }

    private async checkProfile(): Promise<boolean> {
        if (this.checkedProfile) {
            return true;
        }
        const settingsUrl = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_URL_KEY);
        this.checkedProfile = await instrumentOperation("formatter.checkProfileSetting", async (operationId: string) => {
            if (!settingsUrl) {
                sendInfo(operationId, { formatterProfile: "undefined" });
                await vscode.window.showInformationMessage("No active Formatter Profile found, do you want to create a default one?",
                    "Yes", "No").then((result) => {
                        if (result === "Yes") {
                            this.addDefaultProfile();
                        }
                    });
                return false;
            } else {
                if (isRemote(settingsUrl)) {
                    // Will handle remote profile in the next PR
                    sendInfo(operationId, { formatterProfile: "remote" });
                    return false;
                }
                const profilePath = await getProfilePath(settingsUrl);
                if (!(await fse.pathExists(profilePath))) {
                    sendInfo(operationId, { formatterProfile: "notExist" });
                    await vscode.window.showInformationMessage("The active formatter profile does not exist, please check it in the Settings and try again.",
                        "Open Settings", "Generate a default profile").then((result) => {
                            if (result === "Open Settings") {
                                vscode.commands.executeCommand("workbench.action.openSettings", JavaConstants.SETTINGS_URL_KEY);
                                if (vscode.workspace.workspaceFolders?.length) {
                                    vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
                                }
                            } else if (result === "Generate a default profile") {
                                this.addDefaultProfile();
                            }
                        });
                    return false;
                }
                sendInfo(operationId, { formatterProfile: "valid" });
                return true;
            }
        })();
        return this.checkedProfile;
    }

    private async addDefaultProfile(): Promise<void> {
        const defaultProfile: string = path.join(this.context.extensionPath, "webview-resources", "java-formatter.xml");
        const profilePath = await getTargetProfilePath(this.context);
        await fse.copy(defaultProfile, profilePath);
        vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(profilePath), "java.formatterSettingsEditor");
    }
}

export let javaFormatterSettingsEditorProvider: JavaFormatterSettingsEditorProvider;

export function initFormatterSettingsEditorProvider(context: vscode.ExtensionContext) {
    javaFormatterSettingsEditorProvider = new JavaFormatterSettingsEditorProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider(JavaFormatterSettingsEditorProvider.viewType, javaFormatterSettingsEditorProvider, { webviewOptions: { enableFindWidget: true, retainContextWhenHidden: true } }));
}
