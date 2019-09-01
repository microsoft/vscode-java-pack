// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from "vscode-extension-telemetry-wrapper";

import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { initialize as initMisc, showReleaseNotesOnStart } from "./misc";
import { OverviewViewSerializer } from "./overview";
import { validateJavaRuntime, JavaRuntimeViewSerializer } from "./java-runtime";
import { JavaGettingStartedViewSerializer } from "./getting-started";
import { scheduleAction } from "./utils/scheduler";

enum ViewType {
  Auto = "auto",
  Overview = "overview",
  GettingStarted = "gettingStarted",
}

export async function activate(context: vscode.ExtensionContext) {
  initializeTelemetry(context);
  await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(operationId: string, context: vscode.ExtensionContext) {
  initUtils(context);
  initCommands(context);
  initRecommendations(context);
  initMisc(context);

  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.overview", new OverviewViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.runtime", new JavaRuntimeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.gettingStarted", new JavaGettingStartedViewSerializer()));

  scheduleAction("showFirstView").then(async() => {
    presentFirstView(context);
  });

  scheduleAction("showReleaseNotes").then(async() => {
    await showReleaseNotesOnStart(context);
  });

  if (!await validateJavaRuntime()) {
    scheduleAction("showJdkState", true, true).then(() => {
      vscode.commands.executeCommand("java.runtime");
    });
  }
}

async function presentFirstView(context: vscode.ExtensionContext) {
  const isFirstViewPresented = context.globalState.get("isFirstViewPresented") || false;
  if (isFirstViewPresented) {
    return;
  }

  const config = vscode.workspace.getConfiguration("java.help");
  const firstView = config.get("firstView");
  if (firstView === ViewType.GettingStarted) {
    await vscode.commands.executeCommand("java.gettingStarted");
  } else {
    await vscode.commands.executeCommand("java.overview");
  }

  context.globalState.update("isFirstViewPresented", true);
}

function initializeTelemetry(context: vscode.ExtensionContext) {
  const ext = vscode.extensions.getExtension("vscjava.vscode-java-pack");
  const packageInfo = ext ? ext.packageJSON : undefined;
  if (packageInfo) {
    if (packageInfo.aiKey) {
      initialize(packageInfo.id, packageInfo.version, packageInfo.aiKey);
    }
  }
}

export async function deactivate() {
  await disposeTelemetryWrapper();
}
