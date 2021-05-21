// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { DOMAttr, DOMElement, ProfileContent } from "./types";
import { DOMParser, XMLSerializer } from "xmldom";
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
    }
    return path.resolve(formatterUrl);
}

export const getVSCodeSetting = instrumentOperation("formatter.getSetting", async (operationId: string, setting: string, defaultValue: any) => {
    const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
    let result = config.get<any>(setting) ?? vscode.workspace.getConfiguration().get<any>(setting);
    if (result === undefined) {
        sendInfo(operationId, { notFoundSetting: setting });
        return defaultValue;
    }
    return result;
});

export function isRemote(path: string): boolean {
    return path !== null && path.startsWith("http:/") || path.startsWith("https:/");
}

export async function addDefaultProfile(context: vscode.ExtensionContext): Promise<void> {
    const defaultProfile: string = path.join(context.extensionPath, "webview-resources", "java-formatter.xml");
    const targetFileName = "java-formatter.xml";
    let profilePath: string;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders?.length) {
        profilePath = path.posix.join(workspaceFolders[0].uri.fsPath, ".vscode", targetFileName);
    } else {
        const folder: string = context.globalStorageUri.fsPath;
        await fse.ensureDir(folder);
        profilePath = path.posix.join(folder, targetFileName);
    }
    // bug: https://github.com/redhat-developer/vscode-java/issues/1944, only the profiles in posix path can be monitored when changes, so we use posix path for default profile creation temporarily.
    const relativePath = toPosixPath(path.join(".vscode", targetFileName));
    profilePath = toPosixPath(profilePath);
    await fse.copy(defaultProfile, profilePath);
    await vscode.workspace.getConfiguration("java").update("format.settings.url", (workspaceFolders?.length ? relativePath : profilePath), !(workspaceFolders?.length));
    vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(profilePath), "java.formatterSettingsEditor");
}

function toPosixPath(inputPath: string): string {
    return inputPath.split(path.win32.sep).join(path.posix.sep);
}

export function parseProfile(document: vscode.TextDocument): ProfileContent {
    const profileElements = new Map<string, DOMElement>();
    const profileSettings = new Map<string, string>();
    let lastElement = undefined;
    const diagnostics: vscode.Diagnostic[] = [];
    const documentDOM = new DOMParser({
        locator: {}, errorHandler: (_level, msg) => {
            const bracketExp: RegExp = new RegExp("\\[line:(\\d*),col:(\\d*)\\]", "g");
            const result = bracketExp.exec(msg);
            if (result && result.length === 3) {
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(Number(result[1]) - 1, Number(result[2]) - 1), new vscode.Position(Number(result[1]) - 1, Number(result[2]))), msg));
            }
        }
    }).parseFromString(document.getText());
    let settingsVersion = documentDOM.documentElement.getAttribute("version") || JavaConstants.CURRENT_FORMATTER_SETTINGS_VERSION;
    const profiles = documentDOM.documentElement.getElementsByTagName("profile");
    if (!profiles || profiles.length === 0) {
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), "No valid profiles found."));
        return { settingsVersion, diagnostics };
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
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no 'id' property.", vscode.DiagnosticSeverity.Error));
                    continue;
                }
                const value = settings[j].getAttribute("value");
                if (!value) {
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1), new vscode.Position(setting.lineNumber - 1, setting.columnNumber - 1 + settingContent.length)), "The setting has no 'value' property.", vscode.DiagnosticSeverity.Error));
                    continue;
                }
                profileElements.set(id, setting);
                profileSettings.set(id, value);
                lastElement = setting;
            }
            break;
        }
    }
    if (!profileElements.size) {
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), "No valid settings found in the profile."));
        return { settingsVersion, diagnostics };
    }
    const supportedProfileSettings = getSupportedProfileSettings(Number(settingsVersion));
    for (const setting of supportedProfileSettings.values()) {
        const element = profileElements.get(setting.id);
        const value = profileSettings.get(setting.id);
        if (!element || !value) {
            setting.value = FormatterConverter.profile2WebViewConvert(setting.id, getDefaultValue(setting.id))!;
            continue;
        }
        const webViewValue: string | undefined = FormatterConverter.profile2WebViewConvert(setting.id, value);
        if (!webViewValue) {
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
        settingsVersion,
        diagnostics,
        profileElements,
        profileSettings,
        lastElement,
        supportedProfileSettings,
    }
}
