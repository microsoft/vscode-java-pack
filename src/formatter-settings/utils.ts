// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import * as http from "http";
import * as https from "https";
import * as url from "url";
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
    const targetPath = await getTargetPath(context, "java-formatter.xml");
    const profilePath = targetPath.profilePath;
    await fse.copy(defaultProfile, profilePath);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    await vscode.workspace.getConfiguration("java").update("format.settings.url", (workspaceFolders?.length ? targetPath.relativePath : profilePath), !(workspaceFolders?.length));
    vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(profilePath), "java.formatterSettingsEditor");
}

export async function getTargetPath(context: vscode.ExtensionContext, fileName: string): Promise<{relativePath: string, profilePath: string}> {
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
    const relativePath = toPosixPath(path.join(".vscode", fileName));
    profilePath = toPosixPath(profilePath);
    return {relativePath, profilePath};
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
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)), "No valid settings found in the profile."));
        return { settingsVersion, diagnostics };
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
        settingsVersion,
        diagnostics,
        profileElements,
        profileSettings,
        lastElement,
        supportedProfileSettings,
    }
}

export async function downloadFile(settingsUrl: string, extensionVersion: string, targetPath?: string): Promise<string> {
    if (targetPath) {
        await fse.ensureDir(path.dirname(targetPath));
        if (await fse.pathExists(targetPath)) {
            await fse.remove(targetPath);
        }
    }
    return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
        const urlObj: url.Url = url.parse(settingsUrl);
        const options = Object.assign({ headers: Object.assign({}, { "User-Agent": `vscode/${extensionVersion}` }) }, urlObj);
        let client: any;
        if (urlObj.protocol === "https:") {
            client = https;
            // tslint:disable-next-line:no-http-string
        } else if (urlObj.protocol === "http:") {
            client = http;
        } else {
            return reject(new Error("Unsupported protocol."));
        }
        client.get(options, (res: http.IncomingMessage) => {
            let ws: fse.WriteStream;
            let rawData: string;
            if (targetPath) {
                ws = fse.createWriteStream(targetPath);
            } else {
                rawData = "";
            }
            res.on("data", (chunk: string | Buffer) => {
                if (targetPath) {
                    ws.write(chunk);
                } else {
                    rawData += chunk;
                }
            });
            res.on("end", () => {
                if (targetPath) {
                    ws.end();
                    ws.on("close", () => {
                        resolve("");
                    });
                } else {
                    resolve(rawData);
                }
            });
        }).on("error", (err: Error) => {
            reject(err);
        });
    });
}

export async function getVersion(context: vscode.ExtensionContext): Promise<string> {
    const { version } = await fse.readJSON(context.asAbsolutePath("./package.json"));
    return version;
}

export function openFormatterSettings(): void {
    vscode.commands.executeCommand("workbench.action.openSettings", JavaConstants.SETTINGS_URL_KEY);
    if (vscode.workspace.workspaceFolders?.length) {
        vscode.commands.executeCommand("workbench.action.openWorkspaceSettings");
    }
}
