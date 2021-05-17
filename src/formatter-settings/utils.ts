// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";

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

export async function getVSCodeSetting(setting: string, defaultValue: any): Promise<any> {
    return await instrumentOperation("formatter.getSetting", async (operationId: string) => {
        const config = vscode.workspace.getConfiguration(undefined, { languageId: "java" });
        let result = config.get<any>(setting);
        if (result === undefined) {
            result = vscode.workspace.getConfiguration().get<any>(setting);
        }
        if (result === undefined) {
            sendInfo(operationId, { notFoundSetting: setting });
            return defaultValue;
        }
        return result;
    })();
}

export function isRemote(path: string): boolean {
    return path !== null && path.startsWith("http:/") || path.startsWith("https:/");
}

export async function getTargetProfilePath(context: vscode.ExtensionContext, fileName?: string): Promise<string> {
    const targetFileName = fileName || "java-formatter.xml";
    let profilePath: string;
    const workspaceFolder = vscode.workspace.workspaceFolders;
    if (workspaceFolder?.length) {
        profilePath = path.posix.join(workspaceFolder[0].uri.fsPath, ".vscode", targetFileName);
    } else {
        const folder: string = context.globalStorageUri.fsPath;
        await fse.ensureDir(folder);
        profilePath = path.posix.join(folder, targetFileName);
    }
    // bug: https://github.com/redhat-developer/vscode-java/issues/1944, only the profiles in posix path can be monitored when changes, so we use posix path for default profile creation temporarily.
    const relativePath = toPosixPath(path.join(".vscode", targetFileName));
    profilePath = toPosixPath(profilePath);
    await vscode.workspace.getConfiguration("java").update("format.settings.url", (workspaceFolder?.length ? relativePath : profilePath), !(workspaceFolder?.length));
    return profilePath;
}

function toPosixPath(inputPath: string): string {
    return inputPath.split(path.win32.sep).join(path.posix.sep);
}
