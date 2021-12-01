// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import axios from "axios";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { DOMAttr, DOMElement, ProfileContent } from "./types";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { getDefaultValue, getSupportedProfileSettings, JavaConstants } from "./FormatterConstants";
import { FormatterConverter } from "./FormatterConverter";

export async function getProfilePath(formatterUrl: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders?.length && !path.isAbsolute(formatterUrl)) {
        for (const workspaceFolder of workspaceFolders) {
            const filePath = path.resolve(workspaceFolder.uri.fsPath, formatterUrl);
            if (await fse.pathExists(filePath)) {
                return filePath;
            }
        }
    } else {
        return path.resolve(formatterUrl);
    }
    return "";
}

export function getVSCodeSetting(setting: string, defaultValue: any) {
    const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
    let result = config.get<any>(setting) ?? vscode.workspace.getConfiguration().get<any>(setting);
    if (result === undefined) {
        sendInfo("", { notFoundSetting: setting });
        return defaultValue;
    }
    return result;
}

export function isRemote(path: string): boolean {
    return path !== null && path.startsWith("http:/") || path.startsWith("https:/");
}

export async function addDefaultProfile(context: vscode.ExtensionContext): Promise<void> {
    const defaultProfile: string = path.join(context.extensionPath, "webview-resources", "java-formatter.xml");
    const profilePath = await getAbsoluteTargetPath(context, "java-formatter.xml");
    await fse.copy(defaultProfile, profilePath);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    await vscode.workspace.getConfiguration("java").update("format.settings.url", (workspaceFolders?.length ? vscode.workspace.asRelativePath(profilePath) : profilePath), !(workspaceFolders?.length));
    vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(profilePath), "java.formatterSettingsEditor");
}

export async function getAbsoluteTargetPath(context: vscode.ExtensionContext, fileName: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let profilePath: string;
    if (workspaceFolders?.length) {
        profilePath = path.join(workspaceFolders[0].uri.fsPath, ".vscode", fileName);
    } else {
        const folder: string = context.globalStorageUri.fsPath;
        await fse.ensureDir(folder);
        profilePath = path.join(folder, fileName);
    }
     // bug: https://github.com/redhat-developer/vscode-java/issues/1944, only the profiles in posix path can be monitored when changes, so we use posix path for default profile creation temporarily.
    return toPosixPath(profilePath);
}

function toPosixPath(inputPath: string): string {
    return inputPath.split(path.win32.sep).join(path.posix.sep);
}

export function parseProfile(document: vscode.TextDocument): ProfileContent {
    const profileElements = new Map<string, DOMElement>();
    const profileSettings = new Map<string, string>();
    let lastElement = undefined;
    const diagnostics: vscode.Diagnostic[] = [];
    let settingsVersion = JavaConstants.CURRENT_FORMATTER_SETTINGS_VERSION;
    const documentDOM = new DOMParser({
        locator: {}, errorHandler: (_level, msg) => {
            const bracketExp: RegExp = new RegExp("\\[line:(\\d*),col:(\\d*)\\]", "g");
            const result = bracketExp.exec(msg);
            if (result && result.length === 3) {
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(Number(result[1]) - 1, Number(result[2]) - 1), new vscode.Position(Number(result[1]) - 1, Number(result[2]))), msg));
            }
        }
    }).parseFromString(document.getText());
    if (!documentDOM) {
        return { isValid: false, settingsVersion, diagnostics };
    }
    settingsVersion = documentDOM.documentElement.getAttribute("version") || settingsVersion;
    const profiles = documentDOM.documentElement.getElementsByTagName("profile");
    if (!profiles || profiles.length === 0) {
       return { isValid: false, settingsVersion, diagnostics };
    }
    const settingsProfileName: string | undefined = vscode.workspace.getConfiguration("java").get<string>(JavaConstants.SETTINGS_PROFILE_KEY);
    for (let i = 0; i < profiles.length; i++) {
        if (!settingsProfileName || settingsProfileName === profiles[i].getAttribute("name")) {
            if (profiles[i].getAttribute("kind") !== "CodeFormatterProfile") {
                continue;
            }
            settingsVersion = profiles[i].getAttribute("version") || settingsVersion;
            const settings = profiles[i].getElementsByTagName("setting");
            for (let j = 0; j < settings.length; j++) {
                const setting: DOMElement = settings[j] as DOMElement;
                const settingContent: string = new XMLSerializer().serializeToString(setting);
                const id = setting.getAttribute("id");
                if (!id) {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no valid 'id' property.", vscode.DiagnosticSeverity.Error));
                    continue;
                }
                const value = settings[j].getAttribute("value");
                if (!value) {
                    // value maybe "" or null, "" is an valid value comes from deleting the values in the inpux box of the editor, and we will still push diagnostic here.
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no valid 'value' property.", vscode.DiagnosticSeverity.Error));
                    if (value === null) {
                        continue;
                    }
                }
                profileElements.set(id, setting);
                profileSettings.set(id, value);
                lastElement = setting;
            }
            break;
        }
    }
    if (!profileElements.size) {
        return { isValid: false, settingsVersion, diagnostics };
    }
    const supportedProfileSettings = getSupportedProfileSettings(Number(settingsVersion));
    for (const setting of supportedProfileSettings.values()) {
        const element = profileElements.get(setting.id);
        const value = profileSettings.get(setting.id);
        // "" is a valid value, so we distinguish it and undefined here.
        if (!element || value === undefined)  {
            setting.value = FormatterConverter.profile2WebViewConvert(setting.id, getDefaultValue(setting.id))!;
            continue;
        }
        const webViewValue: string | undefined = FormatterConverter.profile2WebViewConvert(setting.id, value);
        if (webViewValue === undefined) {
            const valueNode = element.getAttributeNode("value") as DOMAttr;
            if (!valueNode || !valueNode.nodeValue) {
                continue;
            }
            const elementRange = new vscode.Range(new vscode.Position(valueNode.lineNumber - 1, valueNode.columnNumber), new vscode.Position(valueNode.lineNumber - 1, valueNode.columnNumber + valueNode.nodeValue.length));
            diagnostics.push(new vscode.Diagnostic(elementRange, `"${value}" is not supported in id: "${setting.id}".`, vscode.DiagnosticSeverity.Error));
            profileSettings.delete(setting.id);
            setting.value = FormatterConverter.profile2WebViewConvert(setting.id, getDefaultValue(setting.id))!;
            continue;
        }
        setting.value = webViewValue;
    }
    return {
        isValid: true,
        settingsVersion,
        diagnostics,
        profileElements,
        profileSettings,
        lastElement,
        supportedProfileSettings,
    }
}

export async function downloadFile(settingsUrl: string): Promise<string> {
    try {
        return (await axios.get(settingsUrl)).data;
    } catch (e) {
        const answer = await vscode.window.showErrorMessage(`Failed to get the profile content from uri: ${settingsUrl}. Do you want to retry?`, "Retry", "Open Settings");
        if (answer === "Retry") {
            return downloadFile(settingsUrl);
        } else if (answer === "Open Settings") {
            openFormatterSettings();
        }
        return "";
    }
}

export function openFormatterSettings(): void {
    vscode.commands.executeCommand("workbench.action.openSettings", JavaConstants.SETTINGS_URL_KEY);
    if (vscode.workspace.workspaceFolders?.length) {
        vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
    }
}
