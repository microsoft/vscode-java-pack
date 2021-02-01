// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { loadTextFromFile } from "../utils";
import { instrumentSimpleOperation } from "vscode-extension-telemetry-wrapper";

const KEY_SHOW_WHEN_USING_JAVA = "showWhenUsingJava";
let welcomeView: vscode.WebviewPanel | undefined;

export async function showWelcomeWebview(context: vscode.ExtensionContext, args?: any[]) {
    if (welcomeView) {
        const firstTimeRun = args![0]!.firstTimeRun;
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

    welcomeView.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo.lowres.png"));
    const resourceUri = context.asAbsolutePath("./out/assets/welcome/index.html");
    welcomeView.webview.html = await loadTextFromFile(resourceUri);
    context.subscriptions.push(welcomeView.onDidDispose(_e => welcomeView = undefined));
    context.subscriptions.push(welcomeView.webview.onDidReceiveMessage((message => {
        switch (message.command) {
            case "setWelcomeVisibility":
                setWelcomeVisibility(context, message.visibility);
                break;
            case "showWelcomePage":
                if (welcomeView !== undefined) {
                    welcomeView.webview.postMessage({
                        command: "renderWelcomePage",
                        props: {
                            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
                            firstTimeRun: message.firstTimeRun
                        }
                    });
                }
            default:
                break;
        }
    })));

    let firstTimeRun;
    if (args && args[0] && args[0].firstTimeRun !== undefined) {
        firstTimeRun = args[0].firstTimeRun;
    } else {
        firstTimeRun = true;
    }
    welcomeView.webview.postMessage({
        command: "renderWelcomePage",
        props: {
            showWhenUsingJava: context.globalState.get(KEY_SHOW_WHEN_USING_JAVA),
            firstTimeRun
        }
    });
}

export async function showWelcomePageOnActivation(context: vscode.ExtensionContext) {
    let showWhenUsingJava = context.globalState.get(KEY_SHOW_WHEN_USING_JAVA);
    if (showWhenUsingJava === undefined) {
        showWhenUsingJava = true;
    }

    if (showWhenUsingJava) {
        vscode.commands.executeCommand("java.welcome");
    }

}

const setWelcomeVisibility = instrumentSimpleOperation("setWelcomeVisibility", (context: vscode.ExtensionContext, visibility: boolean) => {
    context.globalState.update(KEY_SHOW_WHEN_USING_JAVA, visibility);
});

