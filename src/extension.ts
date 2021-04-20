// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from "vscode-extension-telemetry-wrapper";
import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { showReleaseNotesOnStart, HelpViewType } from "./misc";
import { initialize as initExp, getExpService } from "./exp";
import { KEY_SHOW_WHEN_USING_JAVA, OverviewViewSerializer, showOverviewPageOnActivation } from "./overview";
import { JavaRuntimeViewSerializer, validateJavaRuntime } from "./java-runtime";
import { scheduleAction } from "./utils/scheduler";
import { showWelcomeWebview, WelcomeViewSerializer } from "./welcome";
import { JavaGettingStartedViewSerializer } from "./getting-started";
import { JavaExtGuideViewSerializer } from "./ext-guide";
import { ClassPathConfigurationViewSerializer } from "./classpath/classpathConfigurationView";
import { TreatmentVariables } from "./exp/TreatmentVariables";
import { MarkdownPreviewSerializer } from "./classpath/markdownPreviewProvider";

export async function activate(context: vscode.ExtensionContext) {
  syncState(context);
  initializeTelemetry(context);
  // initialize exp service ahead of activation operation to make sure exp context properties are set.
  await initExp(context);
  await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(_operationId: string, context: vscode.ExtensionContext) {
  initUtils(context);
  initCommands(context);
  initRecommendations(context);

  // webview serializers to restore pages
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.extGuide", new JavaExtGuideViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.overview", new OverviewViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.runtime", new JavaRuntimeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.gettingStarted", new JavaGettingStartedViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.welcome", new WelcomeViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.classpathConfiguration", new ClassPathConfigurationViewSerializer()));
  context.subscriptions.push(vscode.window.registerWebviewPanelSerializer("java.markdownPreview", new MarkdownPreviewSerializer()));

  const config = vscode.workspace.getConfiguration("java.help");

  if (config.get("firstView") !== HelpViewType.None) {
    let showWhenUsingJava = context.globalState.get(KEY_SHOW_WHEN_USING_JAVA);
    if (showWhenUsingJava === undefined) {
      showWhenUsingJava = vscode.env.uiKind === vscode.UIKind.Desktop;
    }

    if (showWhenUsingJava) {
      scheduleAction("showFirstView", true).then(() => {
        presentFirstView(context);
      });
    }
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
  // Progression rollout EXP for showing welcome page.
  const presentWelcomePageByDefault: boolean = await getExpService()?.getTreatmentVariableAsync(TreatmentVariables.VSCodeConfig, TreatmentVariables.PresentWelcomePageByDefault, true /*checkCache*/) || false;
  if (presentWelcomePageByDefault) {
    await showWelcomeWebview(context);
    return;
  }

  const config = vscode.workspace.getConfiguration("java.help");
  const firstView = config.get("firstView");
  switch (firstView) {
    case HelpViewType.None:
      break;
    case HelpViewType.GettingStarted:
      await showGettingStartedView(context);
      break;
    case HelpViewType.Overview:
    default:
      await showOverviewPageOnActivation(context);
  }
}

async function showGettingStartedView(context: vscode.ExtensionContext, _isForce: boolean = false) {
  if (!!context.globalState.get("isGettingStartedPresented")) {
    return;
  }

  await vscode.commands.executeCommand("java.gettingStarted");
  context.globalState.update("isGettingStartedPresented", true);
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
