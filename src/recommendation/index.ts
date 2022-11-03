// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { initialize as initHandler, extensionRecommendationHandler } from "./handler";
import { isExtensionInstalled, getExtensionContext } from "../utils";

export function initialize(_context: vscode.ExtensionContext) {
  initHandler();
}

export async function validateAndRecommendExtension(extName: string, message: string, isForce: boolean = false) {
  if (isExtensionInstalled(extName)) {
    return true;
  }

  await extensionRecommendationHandler(getExtensionContext(), extName, message, isForce);

  return false;
}
