// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { downloadFile } from "./utils";

export class RemoteProfileProvider implements vscode.TextDocumentContentProvider {

    public static scheme = "formatter";

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const originalUri: vscode.Uri = uri.with({ scheme: "https" });
        return await downloadFile(originalUri.toString());
    } 
}

export function initRemoteProfileProvider(context: vscode.ExtensionContext) {
    const remoteProfileProvider = new RemoteProfileProvider();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(RemoteProfileProvider.scheme, remoteProfileProvider));
}
