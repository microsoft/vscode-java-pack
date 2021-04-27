// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as path from "path";
import * as request from "request-promise-native";
import * as vscode from "vscode";
import { getExtensionContext, loadTextFromFile } from "../utils";
import { findJavaHomes, JavaRuntime } from "./utils/findJavaRuntime";
import architecture = require("arch");
import { resolveRequirements } from "./utils/upstreamApi";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "./types";
import { sourceLevelDisplayName } from "./utils/misc";
import { ProjectType } from "../utils/webview";
import { getProjectNameFromUri, getProjectType } from "../utils/jdt";

let javaRuntimeView: vscode.WebviewPanel | undefined;
let javaHomes: JavaRuntime[];

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
  const resourceUri = context.asAbsolutePath("./out/assets/java-runtime/index.html");
  webviewPanel.webview.html = await loadTextFromFile(resourceUri);

  context.subscriptions.push(webviewPanel.onDidDispose(onDisposeCallback));
  context.subscriptions.push(webviewPanel.webview.onDidReceiveMessage(async (e) => {
    switch (e.command) {
      case "onWillListRuntimes": {
        suggestOpenJdk().then(jdkInfo => {
          applyJdkInfo(jdkInfo);
        });
        findJavaRuntimeEntries().then(data => {
          showJavaRuntimeEntries(data);
        });
        break;
      }
      case "requestJdkInfo": {
        let jdkInfo = await suggestOpenJdk(e.jdkVersion, e.jvmImpl);
        applyJdkInfo(jdkInfo);
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
    if (runtime.java_version >=11 && runtime.java_home) {
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
    const runtime = await resolveRequirements();
    javaDotHome = runtime.java_home;
    const javaVersion = runtime.java_version;
    if (!javaVersion || javaVersion < 11) {
      javaHomeError = `Java 11 or more recent is required to run the Java extension. Preferred JDK "${javaDotHome}" (version ${javaVersion}) doesn't meet the requirement. Please specify or install a recent JDK.`;
    }
  } catch (error) {
    javaHomeError = error.message;
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
