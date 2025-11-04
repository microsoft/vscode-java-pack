// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { initialize as initHandler, extensionRecommendationHandler } from "./handler";
import { isExtensionInstalled, getExtensionContext, getInstalledExtension } from "../utils";
import { initialize as initXmlRecommendation } from "./xml";

export function initialize(_context: vscode.ExtensionContext) {
  initHandler();
  initXmlRecommendation(_context);
}

export async function validateAndRecommendExtension(extName: string, message: string, isForce: boolean = false) {
  if (isExtensionInstalled(extName)) {
    return true;
  }

  await extensionRecommendationHandler(getExtensionContext(), extName, message, isForce);

  return false;
}

export async function validateExtensionInstalled(extName: string, version: string) {
  if(!isExtensionInstalled(extName)) {
    return false;
  }
  if(version && getInstalledExtension(extName)?.packageJSON.version >= version) {
    return true;
  }
  return false;
}
