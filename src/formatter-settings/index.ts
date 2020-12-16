// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { loadTextFromFile } from "../utils";
import * as vscode from "vscode";

let formatterSettingsView: vscode.WebviewPanel | undefined;

export async function formatterSettingsCmdHandler(context: vscode.ExtensionContext, _operationId: string, _tabId?: string) {

  formatterSettingsView = vscode.window.createWebviewPanel("java.formatterSettingsPage", "Java Formatter Settings", {
    viewColumn: vscode.ViewColumn.One,
  }, {
    enableScripts: true,
    enableCommandUris: true,
    retainContextWhenHidden: true
  });

  const resourceUri = context.asAbsolutePath("./out/assets/formatter-settings/index.html");
  formatterSettingsView.webview.html = await loadTextFromFile(resourceUri);
  context.subscriptions.push(formatterSettingsView.onDidDispose(onDidDisposeWebviewPanel));
  context.subscriptions.push(formatterSettingsView.webview.onDidReceiveMessage(async (e) => {
    switch (e.command) {
      case "format": {
        const { code } = e;
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(code));
        break;
      }
      default:
        break;
    }
  }));
}

function onDidDisposeWebviewPanel() {
  formatterSettingsView = undefined;
}