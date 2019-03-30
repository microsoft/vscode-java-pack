// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { readFile as fsReadFile } from "fs";
import * as util from "util";
import * as path from "path";

const readFile = util.promisify(fsReadFile);

import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext } from "../utils";
import { validateJavaRuntime, suggestOpenJdk } from "../java-runtime";

let overviewView: vscode.WebviewPanel | undefined;
const KEY_SHOW_WHEN_USING_JAVA = "showWhenUsingJava";
const KEY_OVERVIEW_LAST_SHOW_TIME = "overviewLastShowTime";

const toggleOverviewVisibilityOperation = instrumentOperation("toggleOverviewVisibility", (operationId: string, context: vscode.ExtensionContext, visibility: boolean) => {
  sendInfo(operationId, {
    visibility: visibility.toString()
  }, {});

  context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

export async function overviewCmdHandler(context: vscode.ExtensionContext, operationId: string, showInBackground: boolean = false) {
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
  webviewPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo.lowres.png"));
  webviewPanel.webview.html = await loadHtmlContent(context);

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));

  const installedExtensions = vscode.extensions.all.map(ext => ext.id.toLowerCase());
  webviewPanel.webview.postMessage({
    command: "hideInstalledExtensions",
    installedExtensions: installedExtensions
  });

  webviewPanel.webview.postMessage({
    command: "setOverviewVisibility",
    visibility: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA)
  });

  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    if (e.command === "setOverviewVisibility") {
      toggleOverviewVisibilityOperation(context, e.visibility);
    } else if (e.command === "requestJdkInfo") {
      let jdkInfo = await suggestOpenJdk(e.jdkVersion, e.jvmImpl);
      applyJdkInfo(jdkInfo);
    }
  }));

  if (!await validateJavaRuntime()) {
    webviewPanel.webview.postMessage({
      command: "showJavaRuntimePanel",
    });

    let jdkInfo = await suggestOpenJdk();
    applyJdkInfo(jdkInfo);
  }


  function applyJdkInfo(jdkInfo: any) {
    webviewPanel.webview.postMessage({
      command: "applyJdkInfo",
      jdkInfo: jdkInfo
    });
  }
}

async function loadHtmlContent(context: vscode.ExtensionContext) {
  let buffer = await readFile(context.asAbsolutePath("./out/assets/overview/index.html"));
  return buffer.toString();
}

export async function showOverviewPageOnActivation(context: vscode.ExtensionContext) {
  let showWhenUsingJava = context.globalState.get(KEY_SHOW_WHEN_USING_JAVA);
  if (showWhenUsingJava === undefined) {
    showWhenUsingJava = true;
  }

  if (showWhenUsingJava) {
    let overviewLastShowTime = context.globalState.get(KEY_OVERVIEW_LAST_SHOW_TIME);
    let showInBackground = overviewLastShowTime !== undefined;
    vscode.commands.executeCommand("java.overview", showInBackground);
  }
}

export class OverviewViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
    if (overviewView) {
      overviewView.reveal();
      webviewPanel.dispose();
      return;
    }

    overviewView = webviewPanel;
    initializeOverviewView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel);
  }
}
