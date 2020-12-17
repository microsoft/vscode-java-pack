declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function formatCode(code: string) {
  vscode.postMessage({
    command: "format",
    code
  });
}

export function exportSettings() {
  vscode.postMessage({
    command: "export",
  });
}
