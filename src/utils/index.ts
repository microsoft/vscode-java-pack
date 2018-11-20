import * as vscode from "vscode";

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


export async function validateAndRecommendExtension(extName: string, message: string): Promise<boolean> {
  if (isExtensionInstalled(extName)) {
    return true;
  }

  await recommendExtension(extName, message);

  return false;
}
