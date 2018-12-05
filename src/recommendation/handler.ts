// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { instrumentCommand } from "../utils";
import { isExtensionInstalled, recommendExtension } from "../utils";

const KEY_RECOMMENDATION_TIMESTAMP_MAP = "recommendationTimeStampMap";

let handler: (...args: any[]) => any;

export function initialize(context: vscode.ExtensionContext) {
  handler = instrumentCommand(context, "recommendExtension", async (context: vscode.ExtensionContext, operationId: string, extName: string, message: string) => {
    sendInfo(operationId, {
      extName: extName
    }, {});

    return recommendExtension(extName, message);
  });
}

export function extensionRecommendationHandler(context: vscode.ExtensionContext, extName: string, message: string, isForce: boolean = false) {
  if (isExtensionInstalled(extName)) {
    return;
  }

  const timeStampMap: { [key: string]: string; } = context.globalState.get(KEY_RECOMMENDATION_TIMESTAMP_MAP, {});
  if (!isForce && timeStampMap && timeStampMap[extName] !== undefined) {
    return;
  }

  handler(extName, message);

  timeStampMap[extName] = Date.now().toString();

  context.globalState.update(KEY_RECOMMENDATION_TIMESTAMP_MAP, timeStampMap);
}
