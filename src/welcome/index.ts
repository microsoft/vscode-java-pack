// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { loadTextFromFile } from "../utils";

export async function showWelcomeWebview(context: vscode.ExtensionContext) {

    const panel = vscode.window.createWebviewPanel(
        "java.welcome",
        "Welcome",
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            enableCommandUris: true
        }
    );

    panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo.lowres.png"));
    const resourceUri = context.asAbsolutePath("./out/assets/welcome/index.html");
    panel.webview.html = await loadTextFromFile(resourceUri);
}
