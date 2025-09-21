// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation, instrumentOperationAsVsCodeCommand, sendInfo } from "vscode-extension-telemetry-wrapper";
import { BeginnerTipsViewSerializer } from "./beginner-tips";
import { initialize as initCommands } from "./commands";
import { initDaemon, sendLSPUsageStats } from "./daemon";
import { initialize as initExp } from "./exp";
import { JavaExtGuideViewSerializer } from "./ext-guide";
import { initFormatterSettingsEditorProvider } from "./formatter-settings";
import { initRemoteProfileProvider } from "./formatter-settings/RemoteProfileProvider";
import { InstallJdkViewSerializer } from "./install-jdk";
import { JavaRuntimeViewSerializer, validateJavaRuntime } from "./java-runtime";
import { HelpViewType, showReleaseNotesOnStart } from "./misc";
import { OverviewViewSerializer } from "./overview";
import { CodeActionProvider } from "./providers/CodeActionProvider";
import { initialize as initRecommendations } from "./recommendation";
import { initialize as initUtils } from "./utils";
import { KEY_SHOW_WHEN_USING_JAVA } from "./utils/globalState";
import { scheduleAction } from "./utils/scheduler";
import { showWelcomeWebview, WelcomeViewSerializer } from "./welcome";
import { ProjectSettingsViewSerializer } from "./project-settings/projectSettingsView";
import { TelemetryFilter } from "./utils/telemetryFilter";
import { commands, workspace } from "vscode";
// import { registerCopilotContextProviders } from "./copilot/contextProvider";

let cleanJavaWorkspaceIndicator: string;
let activatedTimestamp: number;
export let activatingTimestamp: number;

export async function activate(context: vscode.ExtensionContext) {
  activatingTimestamp = performance.now();
  syncState(context);
  initializeTelemetry(context);
  // initialize exp service ahead of activation operation to make sure exp context properties are set.
  await initExp(context);
  await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(_operationId: string, context: vscode.ExtensionContext) {
  initFormatterSettingsEditorProvider(context);
  initRemoteProfileProvider(context);
  initUtils(context);
  initCommands(context);
  initRecommendations(context);
  initDaemon(context);

  activatedTimestamp = performance.now();
  if (context.storageUri) {
    const javaWorkspaceStoragePath = path.join(context.storageUri.fsPath, "..", "redhat.java");
    cleanJavaWorkspaceIndicator = path.join(javaWorkspaceStoragePath, "jdt_ws", ".cleanWorkspace");
  }

  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "java", pattern: "**/*.java" }, new CodeActionProvider()));

  // webview serializers to restore pages
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.extGuide", new JavaExtGuideViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.overview", new OverviewViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.runtime", new JavaRuntimeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.gettingStarted", new BeginnerTipsViewSerializer(context)));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.welcome", new WelcomeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.projectSettings", new ProjectSettingsViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.installJdk", new InstallJdkViewSerializer(context)));
  // Register test command for getImportClassContent
  context.subscriptions.push(instrumentOperationAsVsCodeCommand(
    'java.test.getImportClassContent', async () => {
      await testGetImportClassContent();
    }
  ));
  const config = vscode.workspace.getConfiguration("java.help");

  if (config.get("firstView") !== HelpViewType.None && context.globalState.get(KEY_SHOW_WHEN_USING_JAVA)) {
    scheduleAction("showFirstView", true).then(() => {
      presentFirstView(context);
    });
  }

  if (config.get("showReleaseNotes")) {
    scheduleAction("showReleaseNotes").then(() => {
      showReleaseNotesOnStart(context);
    });
  }

  if (!await validateJavaRuntime()) {
    scheduleAction("showJdkState", true, true).then(() => {
      vscode.commands.executeCommand("java.runtime");
    });
  }

  // await registerCopilotContextProviders(context);
}

async function presentFirstView(context: vscode.ExtensionContext) {
  await showWelcomeWebview(context);
}

function syncState(_context: vscode.ExtensionContext): void {
  _context.globalState.setKeysForSync([KEY_SHOW_WHEN_USING_JAVA]);
}

function initializeTelemetry(_context: vscode.ExtensionContext) {
  const ext = vscode.extensions.getExtension("vscjava.vscode-java-pack");
  const packageInfo = ext ? ext.packageJSON : undefined;
  if (packageInfo) {
    if (packageInfo.aiKey) {
      initialize(packageInfo.id, packageInfo.version, packageInfo.aiKey, {
        replacementOptions: [
          TelemetryFilter.hideUrlOption,
          TelemetryFilter.hideJwtTokenOption
        ]
      });
    }
  }
}

export async function deactivate() {
  const now = performance.now();
  const data = {
    name: "sessionStatus",
    time: Math.round(now - activatedTimestamp)
  }
  if (cleanJavaWorkspaceIndicator && fs.existsSync(cleanJavaWorkspaceIndicator)) {
    data.name = "cleanJavaLSWorkspace";
  }
  sendInfo("", data);
  sendLSPUsageStats();
  await disposeTelemetryWrapper();
}

async function testGetImportClassContent(): Promise<void> {
  try {
    // Get the currently active file
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage("请先打开一个 Java 文件");
      return;
    }

    const document = activeEditor.document;
    if (!document.fileName.endsWith('.java')) {
      vscode.window.showWarningMessage("当前文件不是 Java 文件");
      return;
    }

    // Show information message
    vscode.window.showInformationMessage("正在测试 getImportClassContent 命令...");

    // Call the Java command with the current file URI
    // const args = [document.uri.toString()];
    // const result = await executeJavaLanguageServerCommand(Commands.JAVA_PROJECT_GET_IMPORT_CLASS_CONTENT, ...args);
    const result = await commands.executeCommand("_java.project.get.from.getImportClassContent", document.uri.toString());

    // Display the result
    if (result) {
      const output = JSON.stringify(result, null, 2);
      const doc = await workspace.openTextDocument({
        content: `// getImportClassContent 测试结果\n// 文件: ${document.fileName}\n\n${output}`,
        language: "javascript"
      });
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage("getImportClassContent 命令执行成功！结果已在新窗口中显示。");
    } else {
      vscode.window.showWarningMessage("getImportClassContent 命令返回了空结果");
    }
  } catch (error) {
    console.error("测试 getImportClassContent 时出错:", error);
    vscode.window.showErrorMessage(`测试 getImportClassContent 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}