// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { initialize as initHandler, extensionRecommendationHandler } from "./handler";
import { isExtensionInstalled, getExtensionContext, getInstalledExtension } from "../utils";

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

export async function validateExtensionInstalled(extName: string, version: string) {
  if(!isExtensionInstalled(extName)) {
    return false;
  }
  if(version && getInstalledExtension(extName)?.packageJSON.version >= version) {
    return true;
  }
  return false;
}

export async function validateAndInstallExtensionVersion(extName: string, version: string, message: string, isForce: boolean = false) {
  // Check if extension is installed and meets version requirement
  if (isExtensionInstalled(extName)) {
    const installedExtension = getInstalledExtension(extName);
    if (installedExtension && installedExtension.packageJSON.version >= version) {
      return true;
    }
  }

  // If not forcing and extension exists but version is lower, return false
  if (!isForce && isExtensionInstalled(extName)) {
    return false;
  }

  // Extension not installed or version doesn't meet requirement
  const action = "Install";
  const fullMessage = message || `Extension ${extName} version ${version} or higher is required.`;
  const answer = await vscode.window.showInformationMessage(fullMessage, action);
  
  if (answer === action) {
    try {
      // Install specific version of extension
      const extensionId = version ? `${extName}@${version}` : extName;
      await vscode.window.withProgress(
        { 
          location: vscode.ProgressLocation.Notification, 
          title: `Installing ${extName} version ${version}...`
        }, 
        async () => {
          await vscode.commands.executeCommand("workbench.extensions.installExtension", extensionId);
        }
      );
      
      vscode.window.showInformationMessage(`Successfully installed ${extName} version ${version}.`);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to install ${extName} version ${version}: ${error}`);
      return false;
    }
  }

  return false;
}
