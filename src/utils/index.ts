import * as vscode from "vscode";

export async function validateAndRecommendExtension(extName: string, message: string): Promise<boolean> {
  const ext = vscode.extensions.getExtension(extName);
  if (ext) {
    return true;
  }

  const action = "Details";
  const answer = await vscode.window.showInformationMessage(message, action);
  if (answer === action) {
    await vscode.commands.executeCommand('java.helper.showExtension', extName);
  }

  return false;
}
