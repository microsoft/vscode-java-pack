import * as vscode from "vscode";
import { initialize as initHandler } from "./handler";
import { initialize as initXml } from "./xml";

export function initialize (context: vscode.ExtensionContext) {
  initHandler(context);
  initXml(context);
}
