import * as vscode from "vscode";
import { initialize as initXml } from "./xml";

export function initialize (context: vscode.ExtensionContext) {
  initXml(context);
}
