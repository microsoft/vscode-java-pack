// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { downloadFile } from "./utils";

export class RemoteProfileProvider implements vscode.TextDocumentContentProvider {

    public static scheme = "java-formatter";
    private contentStorage: Map<string, string> = new Map<string, string>();

    public setContent(url: string, content: string): void {
        this.contentStorage.set(url, content);
    }

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const originalUri: vscode.Uri = uri.with({ scheme: "https" });
        return this.contentStorage.get(originalUri.toString()) || downloadFile(originalUri.toString());
    } 
}

export let remoteProfileProvider = new RemoteProfileProvider();

export function initRemoteProfileProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(RemoteProfileProvider.scheme, remoteProfileProvider));
}
