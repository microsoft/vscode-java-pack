import * as vscode from "vscode";

let extensionContext: vscode.ExtensionContext;

export function initialize(context: vscode.ExtensionContext) {
  extensionContext = context;
}

export function getExtensionContext() {
  return extensionContext;
}

export function isExtensionInstalled( extName: string) {
  return !!vscode.extensions.getExtension(extName);
}

export async function recommendExtension(extName: string, message: string): Promise<void> {
  const action = "Details";
  const answer = await vscode.window.showInformationMessage(message, action);
  if (answer === action) {
    await vscode.commands.executeCommand('java.helper.showExtension', extName);
  }
}
