// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { instrumentOperation } from "vscode-extension-telemetry-wrapper";

const M2E_SELECTED_PROFILES = "org.eclipse.m2e.core.selectedProfiles";

export class MavenRequestHandler implements vscode.Disposable {
    private webview: vscode.Webview;
    private disposables: vscode.Disposable[] = [];

    constructor(webview: vscode.Webview) {
        this.webview = webview;
        this.disposables.push(this.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "maven.onWillGetSelectedProfiles": 
                    this.onWillGetSelectedProfiles(message.uri);
                    break;
                case "maven.onWillUpdateSelectProfiles":
                    this.onWillUpdateSelectProfiles(message.uri, message.selectedProfiles);
                    break;
                default:
                    break;
            }
        }));
    }

    private onWillGetSelectedProfiles = instrumentOperation("projectSettings.maven.onWillGetSelectedProfiles", async (_operationId: string, uri: any): Promise<void> => {
        const response: any = await vscode.commands.executeCommand<Object>("java.execute.workspaceCommand",
                "java.project.getSettings", uri, [M2E_SELECTED_PROFILES]);
        const selectedProfiles: string = response?.[M2E_SELECTED_PROFILES];
        if (selectedProfiles) {
            this.webview.postMessage({
                command: "maven.onDidGetSelectedProfiles",
                uri,
                selectedProfiles: selectedProfiles.split(","),
            });
        }
    });

    private onWillUpdateSelectProfiles = instrumentOperation("projectSettings.maven.onWillUpdateSelectProfiles", async (_operationId: string, uri: any, selectedProfiles: string[]): Promise<void> => {
        await vscode.commands.executeCommand("java.execute.workspaceCommand",
            "java.project.updateSettings", uri, { [M2E_SELECTED_PROFILES]: selectedProfiles });
    });

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
