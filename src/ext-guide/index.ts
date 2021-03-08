// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { loadTextFromFile, getExtensionContext } from "../utils";
import { sendInfo, instrumentOperation } from "vscode-extension-telemetry-wrapper";

let javaExtGuideView: vscode.WebviewPanel | undefined;

export async function javaExtGuideCmdHandler(context: vscode.ExtensionContext, operationId: string) {
  if (javaExtGuideView) {
    javaExtGuideView.reveal();
    return;
  }

  javaExtGuideView = vscode.window.createWebviewPanel("java.extGuide", "Java Extension Guide", {
    viewColumn: vscode.ViewColumn.One,
  }, {
    enableScripts: true,
    enableCommandUris: true,
    retainContextWhenHidden: true
  });

  await initializeJavaExtGuideView(context, javaExtGuideView, onDidDisposeWebviewPanel, operationId);
}

function onDidDisposeWebviewPanel() {
  javaExtGuideView = undefined;
}

async function initializeJavaExtGuideView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void, operationId: string) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };

  const resourceUri = context.asAbsolutePath("./out/assets/ext-guide/index.html");
  webviewPanel.webview.html = await loadTextFromFile(resourceUri);

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "tabActivated") {
      let tabId = e.tabId;
      sendInfo(operationId, {
        infoType: "tabActivated",
        tabId: tabId
      });
    } else if (e.command === "installExtensions") {
      const extNames = <string[]>e.extNames;
      await Promise.all(extNames.map(async extName => {
        return vscode.commands.executeCommand("java.helper.installExtension", extName, extName);
      }));
    }
  }));

  vscode.extensions.onDidChange(_e => {
    syncExtensionStatus();
  });

  function syncExtensionStatus() {
    const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
    webviewPanel.webview.postMessage({
      command: "syncExtensionStatus",
      installedExtensions: installedExtensions
    });
  }

  syncExtensionStatus();
}

export class JavaExtGuideViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (javaExtGuideView) {
      javaExtGuideView.reveal();
      webviewPanel.dispose();
      return;
    }

    javaExtGuideView = webviewPanel;
    instrumentOperation("restoreExtGuideView", operationId => {
      initializeJavaExtGuideView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel, operationId);
    })();
  }
}
