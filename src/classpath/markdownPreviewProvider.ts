// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as fse from "fs-extra";
import * as path from "path";
import { getExtensionContext } from "../utils";

class MarkdownPreviewProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    // a cache maps document path to rendered html
    private documentCache: Map<string, string> = new Map<string, string>();
    private disposables: vscode.Disposable[] = [];

    public async show(markdownFilePath: string, title: string, context: vscode.ExtensionContext, webviewPanel?: vscode.WebviewPanel): Promise<void> {
        if (webviewPanel) {
            this.panel = webviewPanel;
        }

        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel("java.markdownPreview", title, vscode.ViewColumn.Beside, {
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, "webview-resources")),
                    vscode.Uri.file(path.dirname(markdownFilePath)),
                ],
                retainContextWhenHidden: true,
                enableFindWidget: true,
                enableCommandUris: true,
                enableScripts: true,
            });
        }

        this.disposables.push(this.panel.onDidDispose(() => {
            this.panel = undefined;
        }));

        this.panel.iconPath = {
            light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
            dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
        };
        this.panel.webview.html = await this.getHtmlContent(this.panel.webview, markdownFilePath, title, context);
        this.panel.title = title;
        this.panel.reveal(this.panel.viewColumn);
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    protected async getHtmlContent(webview: vscode.Webview, markdownFilePath: string, title: string, context: vscode.ExtensionContext): Promise<string> {
        const nonce: string = this.getNonce();
        const styles: string = this.getStyles(webview, context);
        let body: string | undefined = this.documentCache.get(markdownFilePath);
        if (!body) {
            let markdownString: string = await fse.readFile(markdownFilePath, "utf8");
            body = await vscode.commands.executeCommand("markdown.api.render", markdownString);
            this.documentCache.set(markdownFilePath, body as string);
        }
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src 'self' ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';"/>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${styles}
                <base href="${webview.asWebviewUri(vscode.Uri.file(markdownFilePath))}">
            </head>
            <body class="vscode-body scrollBeyondLastLine wordWrap showEditorSelection">
                ${body}
                <script nonce="${nonce}">
                    (function() {
                        const vscode = acquireVsCodeApi();
                        vscode.setState({
                            markdownUri: "${vscode.Uri.file(markdownFilePath).toString()}",
                            title: "${title}",
                        });
                    })();
                </script>
            </body>
            </html>
        `;
    }

    protected getStyles(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const styles: vscode.Uri[] = [
            vscode.Uri.file(path.join(context.extensionPath, "webview-resources", "highlight.css")),
            vscode.Uri.file(path.join(context.extensionPath, "webview-resources", "markdown.css")),
        ];
        return styles.map((styleUri: vscode.Uri) => `<link rel="stylesheet" type="text/css" href="${webview.asWebviewUri(styleUri).toString()}">`).join("\n");
    }

    private getNonce(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

export const markdownPreviewProvider: MarkdownPreviewProvider = new MarkdownPreviewProvider();

export class MarkdownPreviewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        if (state.markdownUri && state.title) {
            markdownPreviewProvider.show(vscode.Uri.parse(state.markdownUri).fsPath, state.title, getExtensionContext(), webviewPanel);
        } else {
            webviewPanel.dispose();
        }
    }
}
