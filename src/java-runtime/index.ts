// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { findRuntimes, getRuntime, IJavaRuntime } from "jdk-utils";
import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { getExtensionContext, getNonce } from "../utils";
import { getProjectNameFromUri, getProjectType } from "../utils/jdt";
import { ProjectType } from "../utils/webview";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "./types";
import { sourceLevelDisplayName } from "./utils/misc";
import { REQUIRED_JDK_VERSION, resolveRequirements } from "./utils/upstreamApi";

let javaRuntimeView: vscode.WebviewPanel | undefined;
let javaHomes: IJavaRuntime[];

export async function javaRuntimeCmdHandler(context: vscode.ExtensionContext, _operationId: string) {
  if (javaRuntimeView) {
    javaRuntimeView.reveal();
    return;
  }

  javaRuntimeView = vscode.window.createWebviewPanel("java.runtime", "Configure Java Runtime", {
    viewColumn: vscode.ViewColumn.One,
  }, {
    enableScripts: true,
    enableCommandUris: true,
    retainContextWhenHidden: true
  });

  await initializeJavaRuntimeView(context, javaRuntimeView, onDidDisposeWebviewPanel);
}

function onDidDisposeWebviewPanel() {
  javaRuntimeView = undefined;
}

async function initializeJavaRuntimeView(context: vscode.ExtensionContext, webviewPanel: vscode.WebviewPanel, onDisposeCallback: () => void) {
  webviewPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
    dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
  };
  webviewPanel.webview.html = getHtmlForWebview(webviewPanel, context.asAbsolutePath("./out/assets/java-runtime/index.js"));

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    switch (e.command) {
      case "onWillListRuntimes": {
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
        break;
      }
      case "updateJavaHome": {
        const { javaHome } = e;
        await vscode.workspace.getConfiguration("java").update("home", javaHome, vscode.ConfigurationTarget.Global);
        break;
      }
      case "updateRuntimePath": {
        const { sourceLevel, runtimePath } = e;
        const runtimes = vscode.workspace.getConfiguration("java").get<any[]>("configuration.runtimes") || [];
        const target = runtimes.find(r => r.name === sourceLevel);
        if (target) {
          target.path = runtimePath;
        } else {
          runtimes.push({
            name: sourceLevel,
            path: runtimePath
          });
        }
        await vscode.workspace.getConfiguration("java").update("configuration.runtimes", runtimes, vscode.ConfigurationTarget.Global);
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
        break;
      }
      case "setDefaultRuntime": {
        const { runtimePath, majorVersion } = e;
        const sourceLevel = sourceLevelDisplayName(majorVersion);
        const runtimes = vscode.workspace.getConfiguration("java").get<any[]>("configuration.runtimes") || [];
        for (const r of runtimes) {
          delete r.default;
        }

        let targetRuntime = runtimes.find(r => r.path === runtimePath);
        if (targetRuntime) {
          targetRuntime.default = true;
        } else {
          targetRuntime = runtimes.find(r => r.name === sourceLevel);
          if (targetRuntime) {
            targetRuntime.path = runtimePath;
            targetRuntime.default = true;
          } else {
            runtimes.push({
              name: sourceLevel,
              path: runtimePath,
              default: true
            });
          }
        }
        await vscode.workspace.getConfiguration("java").update("configuration.runtimes", runtimes, vscode.ConfigurationTarget.Global);
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
        break;
      }
      case "openBuildScript": {
        const { scriptFile, rootUri } = e;
        const rootPath = vscode.Uri.parse(rootUri).fsPath;
        const fullPath = path.join(rootPath, scriptFile);
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(fullPath));
        break;
      }
      case "onWillBrowseForJDK": {
        const javaHomeUri: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectMany: false,
          canSelectFolders: true,
          title: "Specify Java runtime to launch Language Server"
        });
        if (javaHomeUri) {
          const javaHome = javaHomeUri[0].fsPath;
          if (await getRuntime(javaHome)) {
            await vscode.workspace.getConfiguration("java").update("jdt.ls.java.home", javaHome, vscode.ConfigurationTarget.Global);
          } else {
            await vscode.window.showWarningMessage(`${javaHome} is not a valid Java runtime home directory.`);
          }
        }
        break;
      }
      case "onWillRunCommandFromWebview": {
        const { wrappedArgs } = e;
        vscode.commands.executeCommand("java.webview.runCommand", wrappedArgs);
        break;
      }
      default:
        break;
    }
  }));

  function showJavaRuntimeEntries(args: any) {
    webviewPanel.webview.postMessage({
      command: "showJavaRuntimeEntries",
      args: args,
    });
  }

  // refresh webview with latest source levels when classpath (project info) changes
  const javaExt = vscode.extensions.getExtension("redhat.java");
  if (javaExt?.isActive && javaExt?.exports?.onDidClasspathUpdate) {
    const onDidClasspathUpdate: vscode.Event<vscode.Uri> = javaExt.exports.onDidClasspathUpdate;
    const listener = onDidClasspathUpdate((_e: vscode.Uri) => {
      findJavaRuntimeEntries().then(data => {
        showJavaRuntimeEntries(data);
      });
    });
    context.subscriptions.push(webviewPanel.onDidDispose(() => listener.dispose()));
  }
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
    <title>Configure Java Runtime</title>
  </head>
  <body>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
    <div id="content"></div>
  </body>

  </html>`;
}

export class JavaRuntimeViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
    if (javaRuntimeView) {
      javaRuntimeView.reveal();
      webviewPanel.dispose();
      return;
    }

    javaRuntimeView = webviewPanel;
    initializeJavaRuntimeView(getExtensionContext(), webviewPanel, onDidDisposeWebviewPanel);
  }
}

export async function validateJavaRuntime() {
  // TODO:
  // option a) should check Java LS exported API for java_home
  // * option b) use the same way to check java_home as vscode-java
  try {
    const runtime = await resolveRequirements();
    if (runtime.tooling_jre_version >= REQUIRED_JDK_VERSION && runtime.tooling_jre) {
      return true;
    }
  } catch (error) {
  }

  return false;
}

export async function findJavaRuntimeEntries(): Promise<{
  javaRuntimes?: JavaRuntimeEntry[],
  projectRuntimes?: ProjectRuntimeEntry[],
  javaDotHome?: string;
  javaHomeError?: string;
}> {
  if (!javaHomes) {
    const runtimes: IJavaRuntime[] = await findRuntimes({ checkJavac: true, withVersion: true });
    javaHomes = runtimes.filter(r => r.hasJavac);
  }
  const javaRuntimes: JavaRuntimeEntry[] = javaHomes.map(elem => ({
    name: elem.homedir,
    fspath: elem.homedir,
    majorVersion: elem.version?.major || 0,
    type: "from jdk-utils"
  })).sort((a, b) => b.majorVersion - a.majorVersion);

  let javaDotHome;
  let javaHomeError;
  try {
    const runtime = await resolveRequirements();
    javaDotHome = runtime.tooling_jre;
    const javaVersion = runtime.tooling_jre_version;
    if (!javaVersion || javaVersion < REQUIRED_JDK_VERSION) {
      javaHomeError = `Java ${REQUIRED_JDK_VERSION} or more recent is required by the Java language support (redhat.java) extension. Preferred JDK "${javaDotHome}" (version ${javaVersion}) doesn't meet the requirement. Please specify or install a recent JDK.`;
    }
  } catch (error) {
    javaHomeError = (error as Error).message;
  }

  let projectRuntimes = await getProjectRuntimesFromPM();
  if (_.isEmpty(projectRuntimes)) {
    projectRuntimes = await getProjectRuntimesFromLS();
  }

  return {
    javaRuntimes,
    projectRuntimes,
    javaDotHome,
    javaHomeError
  };
}

async function getProjectRuntimesFromPM(): Promise<ProjectRuntimeEntry[]> {
  const ret: ProjectRuntimeEntry[] = [];
  const projectManagerExt = vscode.extensions.getExtension("vscjava.vscode-java-dependency");
  if (vscode.workspace.workspaceFolders && projectManagerExt && projectManagerExt.isActive) {
    let projects: any[] = [];
    for (const wf of vscode.workspace.workspaceFolders) {
      try {
        projects = await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.list", wf.uri.toString()) || [];
      } catch (error) {
        console.error(error);
      }

      for (const project of projects) {
        const runtimeSpec = await getRuntimeSpec(project.uri);
        const projectType: ProjectType = await getProjectType(vscode.Uri.parse(project.uri).fsPath);
        ret.push({
          name: project.displayName || project.name,
          rootPath: project.uri,
          projectType,
          ...runtimeSpec
        });
      }
    }
  }
  return ret;
}

async function getProjectRuntimesFromLS(): Promise<ProjectRuntimeEntry[]> {
  const ret: ProjectRuntimeEntry[] = [];
  const javaExt = vscode.extensions.getExtension("redhat.java");
  if (javaExt && javaExt.isActive) {
    let projects: string[] = [];
    try {
      projects = await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll") || [];
    } catch (error) {
      // LS not ready
    }

    for (const projectRoot of projects) {
      const runtimeSpec = await getRuntimeSpec(projectRoot);
      const projectType: ProjectType = await getProjectType(vscode.Uri.parse(projectRoot).fsPath);
      ret.push({
        name: getProjectNameFromUri(projectRoot),
        rootPath: projectRoot,
        projectType: projectType,
        ...runtimeSpec
      });
    }
  }
  return ret;
}

async function getRuntimeSpec(projectRootUri: string) {
  let runtimePath;
  let sourceLevel;
  const javaExt = vscode.extensions.getExtension("redhat.java");
  if (javaExt && javaExt.isActive) {
    const SOURCE_LEVEL_KEY = "org.eclipse.jdt.core.compiler.source";
    const VM_INSTALL_PATH = "org.eclipse.jdt.ls.core.vm.location";
    try {
      const settings: any = await javaExt.exports.getProjectSettings(projectRootUri, [SOURCE_LEVEL_KEY, VM_INSTALL_PATH]);
      runtimePath = settings[VM_INSTALL_PATH];
      sourceLevel = settings[SOURCE_LEVEL_KEY];
    } catch (error) {
      console.warn(error);
    }
  }

  return {
    runtimePath,
    sourceLevel
  };
}
