// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as path from "path";
import * as request from "request-promise-native";
import * as vscode from "vscode";
import { getExtensionContext, loadTextFromFile } from "../utils";
import { findJavaHomes, getJavaVersion, JavaRuntime } from "./utils/findJavaRuntime";
import architecture = require("arch");
import { checkJavaRuntime } from "./utils/upstreamApi";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "./types";
import { sourceLevelDisplayName } from "./utils/misc";

let javaRuntimeView: vscode.WebviewPanel | undefined;
let javaHomes: JavaRuntime[];

export async function javaRuntimeCmdHandler(context: vscode.ExtensionContext, operationId: string) {
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
  webviewPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo.lowres.png"));
  const resourceUri = context.asAbsolutePath("./out/assets/java-runtime/index.html");
  webviewPanel.webview.html = await loadTextFromFile(resourceUri);

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    switch (e.command) {
      case "requestJdkInfo": {
        let jdkInfo = await suggestOpenJdk(e.jdkVersion, e.jvmImpl);
        applyJdkInfo(jdkInfo);
        break;
      }
      case "updateJavaHome": {
        const { javaHome } = e;
        await vscode.workspace.getConfiguration("java").update("home", javaHome, vscode.ConfigurationTarget.Global);
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
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

        const targetRuntime = runtimes.find(r => r.path === runtimePath);
        if (targetRuntime) {
          targetRuntime.default = true;
        } else {
          runtimes.push({
            name: sourceLevel,
            path: runtimePath,
            default: true
          });
        }
        await vscode.workspace.getConfiguration("java").update("configuration.runtimes", runtimes, vscode.ConfigurationTarget.Global);
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
      }

      default:
        break;
    }
  }));

  function applyJdkInfo(jdkInfo: any) {
    webviewPanel.webview.postMessage({
      command: "applyJdkInfo",
      jdkInfo: jdkInfo
    });
  }

  function showJavaRuntimeEntries(args: any) {
    webviewPanel.webview.postMessage({
      command: "showJavaRuntimeEntries",
      args: args,
    });
  }

  suggestOpenJdk().then(jdkInfo => {
    applyJdkInfo(jdkInfo);
  });

  findJavaRuntimeEntries().then(data => {
    showJavaRuntimeEntries(data);
  });
}

export class JavaRuntimeViewSerializer implements vscode.WebviewPanelSerializer {
  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
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
    const upstreamJavaHome = await checkJavaRuntime();
    if (upstreamJavaHome) {
      const version = await getJavaVersion(upstreamJavaHome);
      if (version && version >= 11) {
        return true;
      }
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
    javaHomes = await findJavaHomes();
  }
  const javaRuntimes: JavaRuntimeEntry[] = javaHomes.map(elem => ({
    name: elem.home,
    fspath: elem.home,
    majorVersion: elem.version,
    type: elem.sources.join(","),
  })).sort((a, b) => b.majorVersion - a.majorVersion);

  let javaDotHome;
  let javaHomeError;
  try {
    javaDotHome = await checkJavaRuntime();
  } catch (error) {
    javaHomeError = error.message;
  }

  const projectRuntimes = await getProjectRuntimes();
  return {
    javaRuntimes,
    projectRuntimes,
    javaDotHome,
    javaHomeError
  };
}

async function getProjectRuntimes(): Promise<ProjectRuntimeEntry[]> {
  const ret: ProjectRuntimeEntry[] = [];
  const javaExt = vscode.extensions.getExtension("redhat.java");
  if (javaExt && javaExt.isActive) {
    let projects: string[] = [];
    try {
       projects = await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll") || [];
    } catch (error) {
      // LS not ready
    }

    const SOURCE_LEVEL_KEY = "org.eclipse.jdt.core.compiler.source";
    const VM_INSTALL_PATH = "org.eclipse.jdt.ls.core.vm.location";
    for (const projectRoot of projects) {
      try {
        const settings: any = await javaExt.exports.getProjectSettings(projectRoot, [SOURCE_LEVEL_KEY, VM_INSTALL_PATH]);
        ret.push({
          name: projectRoot,
          rootPath: projectRoot,
          runtimePath: settings[VM_INSTALL_PATH],
          sourceLevel: settings[SOURCE_LEVEL_KEY]
        });
      } catch (error) {
        // ignore
      }
    }
  }
  return ret;
}

export async function suggestOpenJdk(jdkVersion: string = "openjdk11", impl: string = "hotspot") {
  let os: string = process.platform;
  if (os === "win32") {
    os = "windows";
  } else if (os === "darwin") {
    os = "mac";
  } else {
    os = "linux";
  }

  let arch = architecture();
  if (arch === "x86") {
    arch = "x32";
  }

  return await request.get({
    uri: `https://api.adoptopenjdk.net/v2/info/releases/${jdkVersion}?openjdk_impl=${impl}&arch=${arch}&os=${os}&type=jdk&release=latest`,
    json: true
  });
}
