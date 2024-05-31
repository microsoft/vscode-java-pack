// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";
import { getExtensionContext, getNonce } from "../utils";
import { ClasspathRequestHandler } from "./handlers/ClasspathRequestHandler";
import { MavenRequestHandler } from "./handlers/MavenRequestHandler";
import { CompilerRequestHandler } from "./handlers/CompilerRequestHandler";
import { ProjectSettingsException, ProjectInfo } from "./types";
import _ from "lodash";
import { getProjectNameFromUri, isDefaultProject } from "../utils/jdt";
import compareVersions from "compare-versions";

let projectSettingsPanel: vscode.WebviewPanel | undefined;
let lsApi: LanguageServerAPI | undefined;

const MINIMUM_JAVA_EXTENSION_VERSION: string = "1.31.0";
class ProjectSettingView {

    private classpathRequestHandler: ClasspathRequestHandler | undefined = undefined;

    public async showProjectSettingsPage(sectionId: string = "classpath"): Promise<void> {
        const context: vscode.ExtensionContext = getExtensionContext();
        if (!projectSettingsPanel) {
            projectSettingsPanel = vscode.window.createWebviewPanel(
                "java.projectSettings",
                "Project Settings",
                vscode.ViewColumn.Active,
                {
                    retainContextWhenHidden: true
                }
            );

            await this.initializeWebview(context);
            const oneTimeHook = projectSettingsPanel.webview.onDidReceiveMessage(() => {
                // send the route change msg once react component is ready.
                // and dispose it once it's done.
                projectSettingsPanel?.webview.postMessage({
                    command: "main.onWillChangeRoute",
                    route: sectionId
                });
                oneTimeHook.dispose();
            });
        } else {
            // if the panel is already opened, we just send the route change msg.
            projectSettingsPanel?.webview.postMessage({
                command: "main.onWillChangeRoute",
                route: sectionId
            });
        }
        projectSettingsPanel.reveal();
        
    }

    public async initializeWebview(context: vscode.ExtensionContext): Promise<void> {
        if (!projectSettingsPanel) {
            sendError(new Error("projectSettingsPanel is not defined."));
            return;
        }

        projectSettingsPanel.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
        }

        projectSettingsPanel.onDidDispose(() => {
            projectSettingsPanel = undefined;
        });

        context.subscriptions.push(projectSettingsPanel.onDidDispose(_e => projectSettingsPanel = undefined));

        projectSettingsPanel.iconPath = {
            light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
            dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
        };

        context.subscriptions.push(
            this.classpathRequestHandler = new ClasspathRequestHandler(projectSettingsPanel.webview),
            new CompilerRequestHandler(projectSettingsPanel.webview),
            new MavenRequestHandler(projectSettingsPanel.webview),
            projectSettingsPanel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case "common.onWillListProjects":
                        await this.listProjects();
                        break;
                    case "common.onWillExecuteCommand":
                        this.executeCommand(message.id);
                        break;
                    default:
                        break;
                }
            }),
        );

        projectSettingsPanel.webview.html = this.getHtmlForWebview(projectSettingsPanel.webview, context.asAbsolutePath("./out/assets/project-settings/index.js"));
    }

    private listProjects = instrumentOperation("projectSettings.classpath.listProjects", async (operationId: string) => {
        // listProjects() will be called when the component is mounted,
        // we first check the requirement here in case user triggers 'reload webview'
        if (!(await this.checkRequirement())) {
            return;
        }
        let projects: ProjectInfo[] = await this.getProjectsFromLS();

        _.remove(projects, (p: ProjectInfo) => {
            return isDefaultProject(p.rootPath);
        });

        if (projects.length === 0) {
            projectSettingsPanel?.webview.postMessage({
                command: "main.onException",
                exception: ProjectSettingsException.NoJavaProjects,
            });
        } else {
            projectSettingsPanel?.webview.postMessage({
                command: "main.onDidListProjects",
                projectInfo: projects,
            });
        }

        sendInfo(operationId, {
            projectNumber: projects.length,
        });
    });

    private checkRequirement = async (): Promise<boolean> => {
        if (lsApi) {
            return true;
        }
        const javaExt = vscode.extensions.getExtension("redhat.java");
        if (!javaExt) {
            projectSettingsPanel?.webview.postMessage({
                command: "main.onException",
                exception: ProjectSettingsException.JavaExtensionNotInstalled,
            });
            const err: Error = new Error("The extension 'redhat.java' is not installed.");
            setUserError(err);
            sendError(err);
            return false;
        }

        const javaExtVersion: string = javaExt.packageJSON.version;
        if (compareVersions(javaExtVersion, MINIMUM_JAVA_EXTENSION_VERSION) < 0) {
            projectSettingsPanel?.webview.postMessage({
                command: "main.onException",
                exception: ProjectSettingsException.StaleJavaExtension,
            });
            const err: Error = new Error(`The extension version of 'redhat.java' (${javaExtVersion}) is too stale.`);
            setUserError(err);
            sendError(err);
            return false;
        }

        await javaExt.activate();
        lsApi = javaExt.exports;

        if (lsApi) {
            getExtensionContext().subscriptions.push(
                lsApi.onDidProjectsImport(() => {
                    this.listProjects();
                }),
                lsApi.onDidClasspathUpdate((uri: vscode.Uri) => {
                    this.classpathRequestHandler?.debounceLoadProjectClasspath(uri);
                }),
            );
        }

        return true;
    };

    private async getProjectsFromLS(): Promise<ProjectInfo[]> {
        const ret: ProjectInfo[] = [];
        let projects: string[] = [];
        try {
            projects = await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll") || [];
        } catch (error) {
            // LS not ready
        }

        for (const projectRoot of projects) {
            ret.push({
                name: getProjectNameFromUri(projectRoot),
                rootPath: projectRoot,
            });
        }
        return ret;
    }

    private getHtmlForWebview(webview: vscode.Webview, scriptPath: string) {
        const scriptPathOnDisk = vscode.Uri.file(scriptPath);
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <title>Project Settings</title>
        </head>
        <body>
            <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
            <div id="content"></div>
        </body>

        </html>
        `;
    }

    private executeCommand = instrumentOperation("projectSetting.executeCommand", async (operationId: string, commandId: string) => {
        await vscode.commands.executeCommand(commandId);
        sendInfo(operationId, {
            operationName: "projectSetting.executeCommand",
            arg: commandId,
        });
    });
}

export class ProjectSettingsViewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
        projectSettingsPanel = webviewPanel;
        await projectSettingView.initializeWebview(getExtensionContext());
    }
}

interface LanguageServerAPI {
    onDidProjectsImport: vscode.Event<vscode.Uri>;
    onDidClasspathUpdate: vscode.Event<vscode.Uri>;
}

export const projectSettingView = new ProjectSettingView();