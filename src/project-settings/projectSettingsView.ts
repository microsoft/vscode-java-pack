// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperation, sendError, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext, getNonce } from "../utils";
import { ClasspathRequestHandler } from "./handlers/classpath/ClasspathRequestHandler";
import { MavenRequestHandler } from "./handlers/classpath/MavenRequestHandler";

let projectSettingsPanel: vscode.WebviewPanel | undefined;
class ProjectSettingView {

    public async showProjectSettingsPage(sectionId: string = "classpath"): Promise<void> {
        const context: vscode.ExtensionContext = getExtensionContext();
        if (!projectSettingsPanel) {
            projectSettingsPanel = vscode.window.createWebviewPanel(
                "java.projectSettings",
                "Project Settings",
                vscode.ViewColumn.Active,
                {
                    retainContextWhenHidden: true
                }
            );

            await this.initializeWebview(context);
        }

        projectSettingsPanel.reveal();
        const oneTimeHook = projectSettingsPanel.webview.onDidReceiveMessage(() => {
            // send the route change msg once react component is ready.
            // and dispose it once it's done.
            projectSettingsPanel!.webview.postMessage({
                command: "main.onWillChangeRoute",
                route: sectionId
            });
            oneTimeHook.dispose();
        })
    }

    public async initializeWebview(context: vscode.ExtensionContext): Promise<void> {
        if (!projectSettingsPanel) {
            sendError(new Error("projectSettingsPanel is not defined."));
            return;
        }

        projectSettingsPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        }

        projectSettingsPanel.onDidDispose(() => {
            projectSettingsPanel = undefined;
        });

        context.subscriptions.push(projectSettingsPanel.onDidDispose(_e => projectSettingsPanel = undefined));

        projectSettingsPanel.iconPath = {
            light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
            dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
        };

        context.subscriptions.push(
            new ClasspathRequestHandler(projectSettingsPanel.webview),
            new MavenRequestHandler(projectSettingsPanel.webview),
            projectSettingsPanel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case "common.onWillExecuteCommand":
                        this.executeCommand(message.id);
                        break;
                    default:
                        break;
                }
            }),
        );

        projectSettingsPanel.webview.html = this.getHtmlForWebview(projectSettingsPanel.webview, context.asAbsolutePath("./out/assets/project-settings/index.js"));
    }

    private getHtmlForWebview(webview: vscode.Webview, scriptPath: string) {
        const scriptPathOnDisk = vscode.Uri.file(scriptPath);
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <title>Project Settings</title>
        </head>
        <body>
            <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
            <div id="content"></div>
        </body>

        </html>
        `;
    }

    private executeCommand = instrumentOperation("projectSetting.executeCommand", async (operationId: string, commandId: string) => {
        await vscode.commands.executeCommand(commandId);
        sendInfo(operationId, {
            operationName: "projectSetting.executeCommand",
            arg: commandId,
        });
    });
}

export class ProjectSettingsViewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
        projectSettingsPanel = webviewPanel;
        await projectSettingView.initializeWebview(getExtensionContext());
    }
}

export const projectSettingView = new ProjectSettingView();