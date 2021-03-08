// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

import * as path from "path";

import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext } from "../utils";
import { loadTextFromFile } from "../utils";

let overviewView: vscode.WebviewPanel | undefined;
export const KEY_SHOW_WHEN_USING_JAVA = "showWhenUsingJava";
const KEY_OVERVIEW_LAST_SHOW_TIME = "overviewLastShowTime";

const toggleOverviewVisibilityOperation = instrumentOperation("toggleOverviewVisibility", (operationId: string, context: vscode.ExtensionContext, visibility: boolean) => {
  sendInfo(operationId, {
    visibility: visibility.toString()
  }, {});

  context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

export async function overviewCmdHandler(context: vscode.ExtensionContext, _operationId: string, showInBackground: boolean = false) {
  if (overviewView) {
    overviewView.reveal();
    return;
  }

  overviewView = vscode.window.createWebviewPanel(
    "java.overview",
    "Java Overview",
    {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: showInBackground
    },
    {
      enableScripts: true,
      enableCommandUris: true,
      retainContextWhenHidden: true
    }
  );

  context.globalState.update(KEY_OVERVIEW_LAST_SHOW_TIME, Date.now().toString());

  await initializeOverviewView(context, overviewView, onDidDisposeWebviewPanel);
}

function onDidDisposeWebviewPanel() {
  overviewView = undefined;
}

async function initializeOverviewView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };
  const resourceUri = context.asAbsolutePath("./out/assets/overview/index.html");
  webviewPanel.webview.html = await loadTextFromFile(resourceUri);

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));

  function syncExtensionVisibility() {
    const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
    webviewPanel.webview.postMessage({
      command: "syncExtensionVisibility",
      installedExtensions: installedExtensions
    });
  }

  syncExtensionVisibility();

  vscode.extensions.onDidChange(_e => {
    syncExtensionVisibility();
  });

  webviewPanel.webview.postMessage({
    command: "setOverviewVisibility",
    visibility: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA)
  });

  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "setOverviewVisibility") {
      toggleOverviewVisibilityOperation(context, e.visibility);
    } else if (e.command) {
      sendInfo("", {
        referrer: "overview",
        command: e.command,
        arg: e.args && e.args.length ? e.args[0] : ""
      });

      await vscode.commands.executeCommand(e.command, ...e.args);
    }
  }));
}

export async function showOverviewPageOnActivation(context: vscode.ExtensionContext) {
    let overviewLastShowTime = context.globalState.get(KEY_OVERVIEW_LAST_SHOW_TIME);
    let showInBackground = overviewLastShowTime !== undefined;
    vscode.commands.executeCommand("java.overview", showInBackground);
}

export class OverviewViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (overviewView) {
      overviewView.reveal();
      webviewPanel.dispose();
      return;
    }

    overviewView = webviewPanel;
    initializeOverviewView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel);
  }
}
