import * as vscode from 'vscode';
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from 'vscode-extension-telemetry-wrapper';

import { initialize as initUtils } from "./utils";
import { initialize as initCommands } from "./commands";
import { initialize as initRecommendations } from "./recommendation";
import { showOverviewPageOnActivation } from './overview';

export async function activate(context: vscode.ExtensionContext) {
  initializeTelemetry(context);
  await instrumentOperation('activation', initializeExtension)(context);
}

async function initializeExtension(operationId: string, context: vscode.ExtensionContext) {
  initUtils(context);
  initCommands(context);
  initRecommendations(context);

  await showOverviewPageOnActivation(context);
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
