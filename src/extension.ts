// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from "vscode-extension-telemetry-wrapper";

import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { initialize as initMisc, showReleaseNotesOnStart, HelpViewType } from "./misc";
import { showOverviewPageOnActivation } from "./overview";
import { validateJavaRuntime } from "./java-runtime";
// import { JavaGettingStartedViewSerializer } from "./getting-started";
import { scheduleAction } from "./utils/scheduler";

export async function activate(context: vscode.ExtensionContext) {
  initializeTelemetry(context);
  await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(operationId: string, context: vscode.ExtensionContext) {
  initUtils(context);
  initCommands(context);
  initRecommendations(context);
  initMisc(context);

  // disable webview serializer because of https://github.com/microsoft/vscode/issues/80185
  // context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.overview", new OverviewViewSerializer()));
  // context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.runtime", new JavaRuntimeViewSerializer()));
  // context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.gettingStarted", new JavaGettingStartedViewSerializer()));

  scheduleAction("showFirstView", true).then(() => {
    presentFirstView(context);
  });

  scheduleAction("showReleaseNotes").then(() => {
    showReleaseNotesOnStart(context);
  });

  if (!await validateJavaRuntime()) {
    scheduleAction("showJdkState", true, true).then(() => {
      vscode.commands.executeCommand("java.runtime");
    });
  }
}

async function presentFirstView(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("java.help");
  const firstView = config.get("firstView");
  if (firstView === HelpViewType.GettingStarted) {
    await showGettingStartedView(context);
  } else {
    await showOverviewPageOnActivation(context);
  }
}

async function showGettingStartedView(context: vscode.ExtensionContext, isForce: boolean = false) {
  if (!!context.globalState.get("isGettingStartedPresented")) {
    return;
  }

  await vscode.commands.executeCommand("java.gettingStarted");
  context.globalState.update("isGettingStartedPresented", true);
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
