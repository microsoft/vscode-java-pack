// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { getExtensionContext, loadTextFromFile } from "../utils";
import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";

const KEY_SHOW_WHEN_USING_JAVA = "showWhenUsingJava";
const KEY_IS_WELCOME_PAGE_VIEWED = "isWelcomePageViewed";
let welcomeView: vscode.WebviewPanel | undefined;

export async function showWelcomeWebview(context: vscode.ExtensionContext, _operationId?: string, options?: any) {
    if (options?.firstTimeRun) {
        setFirstTimeRun(context, true);
    }

    if (welcomeView) {
        welcomeView.reveal();
        fetchInitProps(context);
    } else {
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
        await initializeWelcomeView(context, welcomeView, onDidDisposeWebviewPanel);
    }
}

export class WelcomeViewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
        if (welcomeView) {
            welcomeView.reveal();
            webviewPanel.dispose();
            return;
        }

        welcomeView = webviewPanel;
        initializeWelcomeView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel);
    }
}

function onDidDisposeWebviewPanel() {
    welcomeView = undefined;
}

async function initializeWelcomeView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void) {
    webviewPanel.iconPath = {
        light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
        dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
    };
    const resourceUri = context.asAbsolutePath("./out/assets/welcome/index.html");
    webviewPanel.webview.html = await loadTextFromFile(resourceUri);
    context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
    context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage((message => {
        switch (message.command) {
            case "onWillFetchInitProps":
                fetchInitProps(context);
                break;
            case "onWillShowTourPage":
                showTourPage(context);
                break;
            case "setWelcomeVisibility":
                setWelcomeVisibility(context, message.visibility);
                break;
            case "sendInfo":
                sendInfo("", message.data);
                break;
            default:
                break;
        }
    })));
}

const setWelcomeVisibility = instrumentSimpleOperation("setWelcomeVisibility", (context: vscode.ExtensionContext, visibility: boolean) => {
    context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

const setFirstTimeRun = (context: vscode.ExtensionContext, firstTimeRun: boolean) => {
    context.globalState.update(KEY_IS_WELCOME_PAGE_VIEWED, !firstTimeRun);
};

const fetchInitProps = (context: vscode.ExtensionContext) => {
    welcomeView?.webview.postMessage({
        command: "onDidFetchInitProps",
        props: {
            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
            firstTimeRun: context.globalState.get(KEY_IS_WELCOME_PAGE_VIEWED) !== true
        }
    });
    setFirstTimeRun(context, false);
};

const showTourPage = (context: vscode.ExtensionContext) => {
    welcomeView?.webview.postMessage({
        command: "onDidFetchInitProps",
        props: {
            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
            firstTimeRun: true
        }
    });
    setFirstTimeRun(context, false);
};
