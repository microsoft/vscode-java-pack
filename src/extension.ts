// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from 'vscode';
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from 'vscode-extension-telemetry-wrapper';

import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { initialize as initMisc, showReleaseNotesOnStart } from "./misc";
import { showOverviewPageOnActivation } from './overview';

export async function activate(context: vscode.ExtensionContext) {
  initializeTelemetry(context);
  await instrumentOperation('activation', initializeExtension)(context);
}

async function initializeExtension(operationId: string, context: vscode.ExtensionContext) {
  initUtils(context);
  initCommands(context);
  initRecommendations(context);
  initMisc(context);

  await showOverviewPageOnActivation(context);
  await showReleaseNotesOnStart(context);
}

function initializeTelemetry(context: vscode.ExtensionContext) {
  const ext = vscode.extensions.getExtension('vscjava.vscode-java-pack');
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
