import * as vscode from "vscode";
import { initialize as initHandler, extensionRecommendationHandler } from "./handler";
import { initialize as initXml } from "./xml";
import { isExtensionInstalled, getExtensionContext } from "../utils";

export function initialize (context: vscode.ExtensionContext) {
  initHandler(context);
  initXml(context);
}

export async function validateAndRecommendExtension(extName: string, message: string) {
  if (isExtensionInstalled(extName)) {
    return true;
  }

  await extensionRecommendationHandler(getExtensionContext(), extName, message);

  return false;
}
