// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from "vscode-extension-telemetry-wrapper";
import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { showReleaseNotesOnStart, HelpViewType } from "./misc";
import { initialize as initExp } from "./exp";
import { OverviewViewSerializer } from "./overview";
import { JavaRuntimeViewSerializer, validateJavaRuntime } from "./java-runtime";
import { scheduleAction } from "./utils/scheduler";
import { showWelcomeWebview, WelcomeViewSerializer } from "./welcome";
import { JavaGettingStartedViewSerializer } from "./getting-started";
import { JavaExtGuideViewSerializer } from "./ext-guide";
import { ClassPathConfigurationViewSerializer } from "./classpath/classpathConfigurationView";
import { initFormatterSettingsEditorProvider } from "./formatter-settings";
import { initRemoteProfileProvider } from "./formatter-settings/RemoteProfileProvider";
import { CodeActionProvider } from "./providers/CodeActionProvider";
import { KEY_IS_WELCOME_PAGE_VIEWED, KEY_SHOW_WHEN_USING_JAVA } from "./utils/globalState";
import { isWalkthroughEnabled } from "./utils/walkthrough";

export async function activate(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "java", pattern: "**/*.java" }, new CodeActionProvider()));

  // webview serializers to restore pages
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.extGuide", new JavaExtGuideViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.overview", new OverviewViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.runtime", new JavaRuntimeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.gettingStarted", new JavaGettingStartedViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.welcome", new WelcomeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.classpathConfiguration", new ClassPathConfigurationViewSerializer()));

  const config = vscode.workspace.getConfiguration("java.help");

  // for control group where walkthrough is not enabled, present first view for once.
  const walkthroughEnabled = await isWalkthroughEnabled();
  if (walkthroughEnabled === false                            // control group
    && !context.globalState.get(KEY_IS_WELCOME_PAGE_VIEWED)   // first time
    && vscode.env.uiKind === vscode.UIKind.Desktop            // desktop only (no popups on Codespaces)
  ) {
    presentFirstView(context);
  }

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
      initialize(packageInfo.id, packageInfo.version, packageInfo.aiKey, { firstParty: true });
    }
  }
}

export async function deactivate() {
  await disposeTelemetryWrapper();
}
