import * as vscode from "vscode";

function showInfoButton() {
  let infoButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
  infoButton.command = "java.overview";
  infoButton.text = "$(info)";
  infoButton.tooltip = "Learn more about Java features";
  infoButton.show();
}

export function initialize(context: vscode.ExtensionContext) {
  showInfoButton();
}
