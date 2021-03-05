// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { getExtensionContext, loadTextFromFile } from "../utils";
import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";

const KEY_SHOW_WHEN_USING_JAVA = "showWhenUsingJava";
const KEY_IS_WELCOME_PAGE_VIEWED = "isWelcomePageViewed";
let welcomeView: vscode.WebviewPanel | undefined;

export async function showWelcomeWebview(context: vscode.ExtensionContext, options?: any) {
    if (welcomeView) {
        const firstTimeRun = options?.firstTimeRun;
        if (firstTimeRun === undefined) {
            welcomeView.reveal();
        } else {
            welcomeView.webview.postMessage({
                command: "renderWelcomePage",
                props: {
                    showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
                    firstTimeRun
                }
            });
        }
        return;
    }

    welcomeView = vscode.window.createWebviewPanel(
        "java.welcome",
        "Welcome",
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            enableCommandUris: true,
            retainContextWhenHidden: true
        }
    );
    let firstTimeRun = options?.firstTimeRun || context.globalState.get(KEY_IS_WELCOME_PAGE_VIEWED) !== true;
    await initializeWelcomeView(context, welcomeView, firstTimeRun, onDidDisposeWebviewPanel);
}

function onDidDisposeWebviewPanel() {
    welcomeView = undefined;
}

async function initializeWelcomeView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, firstTimeRun: boolean, onDisposeCallback: () => void) {
    webviewPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo.svg"));
    const resourceUri = context.asAbsolutePath("./out/assets/welcome/index.html");
    webviewPanel.webview.html = await loadTextFromFile(resourceUri);
    context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
    context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage((message => {
        switch (message.command) {
            case "setWelcomeVisibility":
                setWelcomeVisibility(context, message.visibility);
                break;
            case "showWelcomePage":
                if (webviewPanel !== undefined) {
                    webviewPanel.webview.postMessage({
                        command: "renderWelcomePage",
                        props: {
                            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
                            firstTimeRun: message.firstTimeRun
                        }
                    });
                }
            case "sendInfo":
                sendInfo("", message.data);
            default:
                break;
        }
    })));

    webviewPanel.webview.postMessage({
        command: "renderWelcomePage",
        props: {
            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
            firstTimeRun
        }
    });
    context.globalState.update(KEY_IS_WELCOME_PAGE_VIEWED, true);
}

const setWelcomeVisibility = instrumentSimpleOperation("setWelcomeVisibility", (context: vscode.ExtensionContext, visibility: boolean) => {
    context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

export class WelcomeViewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
      if (welcomeView) {
        welcomeView.reveal();
        webviewPanel.dispose();
        return;
      }
  
      welcomeView = webviewPanel;
      initializeWelcomeView(getExtensionContext(), webviewPanel, false, onDidDisposeWebviewPanel);
    }
  }
  