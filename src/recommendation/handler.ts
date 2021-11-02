// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { isExtensionInstalled, recommendExtension } from "../utils";
import { KEY_RECOMMENDATION_TIMESTAMP_MAP } from "../utils/globalState";

let handler: (...args: any[]) => any;

export function initialize() {
  handler = instrumentOperation("recommendExtension", async (operationId: string, extName: string, message: string) => {
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
