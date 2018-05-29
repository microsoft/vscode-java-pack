import * as vscode from 'vscode';

import { readFile } from 'fs';

export default () => {
  const welcomeView = vscode.window.createWebviewPanel(
    'java.welcome',
    'Java: Welcome',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      enableCommandUris: true
    }
  );

  readFile(require.resolve('./assets/index.html'), (err, data) => {
    welcomeView.webview.html = data.toString();
  });

};
