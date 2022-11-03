// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext, getNonce } from "../utils";
import { KEY_IS_WELCOME_PAGE_VIEWED, KEY_SHOW_WHEN_USING_JAVA } from "../utils/globalState";

let welcomeView: vscode.WebviewPanel | undefined;

// from command palette
export async function showWelcomeWebviewBeside(context: vscode.ExtensionContext, _operationId?: string, options?: {
    firstTimeRun?: boolean;
}) {
    const newOptions = { openBeside: true, firstTimeRun: options?.firstTimeRun };
    await showWelcomeWebview(context, _operationId, newOptions);
}

export async function showWelcomeWebview(context: vscode.ExtensionContext, _operationId?: string, options?: {
    firstTimeRun?: boolean;
    openBeside?: boolean;
}) {
    if (options?.firstTimeRun) {
        setFirstTimeRun(context, true);
    }

    if (welcomeView) {
        welcomeView.reveal();
        fetchInitProps(context);
    } else {
		let column = vscode.ViewColumn.Active;
		if (options?.openBeside) {
			// "smart" Beside
			const ate = vscode.window.activeTextEditor;
			column = (ate === undefined || ate.viewColumn === vscode.ViewColumn.One) ?
				vscode.ViewColumn.Two :
				vscode.ViewColumn.One;
		}

        welcomeView = vscode.window.createWebviewPanel(
            "java.welcome",
            "Java Help Center",
            column,
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
    webviewPanel.webview.html = getHtmlForWebview(webviewPanel, context.asAbsolutePath("./out/assets/welcome/index.js"));
    context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
    context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage((message => {
        switch (message.command) {
            case "onWillFetchInitProps":
                fetchInitProps(context);
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
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("java.completion.filteredTypes")) {
            fetchInitProps(context);
        }
    }));
}

function getHtmlForWebview(webviewPanel: vscode.WebviewPanel, scriptPath: string) {
    const scriptPathOnDisk = vscode.Uri.file(scriptPath);
    const scriptUri = webviewPanel.webview.asWebviewUri(scriptPathOnDisk);

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
        <meta name="theme-color" content="#000000">
        <title>Java Help Center</title>
    </head>
    <body>
        <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
        <div id="content"></div>
    </body>
    </html>`;
}

const setWelcomeVisibility = instrumentSimpleOperation("setWelcomeVisibility", (context: vscode.ExtensionContext, visibility: boolean) => {
    context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

const setFirstTimeRun = (context: vscode.ExtensionContext, firstTimeRun: boolean) => {
    context.globalState.update(KEY_IS_WELCOME_PAGE_VIEWED, !firstTimeRun);
};

export const fetchInitProps = async (context: vscode.ExtensionContext) => {
    welcomeView?.webview.postMessage({
        command: "onDidFetchInitProps",
        props: {
            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
            firstTimeRun: context.globalState.get(KEY_IS_WELCOME_PAGE_VIEWED) !== true,
            isAwtDisabled: isAwtDisabled(),
        }
    });
    setFirstTimeRun(context, false);
};

function isAwtDisabled(): boolean {
    const filteredTypes: string[] = vscode.workspace.getConfiguration("java.completion").get<string[]>("filteredTypes") || [];
    return filteredTypes.some((type: string) => {
        return type.startsWith("java.awt.");
    });
}
