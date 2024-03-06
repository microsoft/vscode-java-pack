// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { getNonce, webviewCmdLinkHandler } from "../utils";

const WEBVIEW_ID = "java.gettingStarted";
const WEBVIEW_TITLE = "Tips for Beginners";

export async function javaGettingStartedCmdHandler(context: vscode.ExtensionContext, _operationId: string) {
  BeginnerTipsPage.createOrShow(context.extensionPath);
}

export class BeginnerTipsViewSerializer implements vscode.WebviewPanelSerializer {
	constructor(private context: vscode.ExtensionContext) { }
	async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: unknown) {
		BeginnerTipsPage.createOrShow(this.context.extensionPath, webviewPanel);
	}
}

class BeginnerTipsPage {
	public static instance: BeginnerTipsPage | undefined;
	private static readonly viewType = WEBVIEW_ID;
	private _panel: vscode.WebviewPanel | undefined;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string, webviewPanel?: vscode.WebviewPanel) {
		if (BeginnerTipsPage.instance) {
			BeginnerTipsPage.instance._panel?.reveal();
		} else {
			BeginnerTipsPage.instance = webviewPanel ?
				new BeginnerTipsPage(extensionPath, webviewPanel) :
				new BeginnerTipsPage(extensionPath, vscode.ViewColumn.One);
		}
	}

	private constructor(extensionPath: string, column: vscode.ViewColumn);
	private constructor(extensionPath: string, webviewPanel: vscode.WebviewPanel);
	private constructor(extensionPath: string, columnOrwebviewPanel: vscode.ViewColumn | vscode.WebviewPanel) {
		this._extensionPath = extensionPath;
		if ((columnOrwebviewPanel as vscode.WebviewPanel).viewType) {
			this._panel = columnOrwebviewPanel as vscode.WebviewPanel;
		} else {
			this._panel = vscode.window.createWebviewPanel(BeginnerTipsPage.viewType, WEBVIEW_TITLE, columnOrwebviewPanel as vscode.ViewColumn, {
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(this._extensionPath, 'out'))
				],
				enableCommandUris: true,
				retainContextWhenHidden: true
			});
		}

    this._panel.iconPath = {
      light: vscode.Uri.file(path.join(this._extensionPath, "caption.light.svg")),
      dark: vscode.Uri.file(path.join(this._extensionPath, "caption.dark.svg"))
    };
    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'onWillActivateTab':
					this.doActivateTab(message.payload);
					return;
				case 'onWillReloadWindow':
					this.doReloadWindow();
			}
		}, null, this._disposables);
	}

	private async doActivateTab(payload: {tabId: string}) {
    sendInfo("", {
      infoType: "tabActivated",
      tabId: payload.tabId
    });
	}

	private async doReloadWindow() {
		await webviewCmdLinkHandler({
			webview: BeginnerTipsPage.viewType,
			identifier: "Reload Window",
			command: "workbench.action.reloadWindow"
		});
	}

	public dispose() {
		BeginnerTipsPage.instance = undefined;

		this._panel?.dispose();
		this._panel = undefined;

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview() {
		const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'out', "assets", "beginner-tips", "index.js"));
		const scriptUri = this._panel?.webview.asWebviewUri(scriptPathOnDisk);

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>${WEBVIEW_TITLE}</title>
			</head>
			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>

				<script nonce="${nonce}" src="${scriptUri}" type="module"></script>
			</body>
			</html>`;
	}
}
