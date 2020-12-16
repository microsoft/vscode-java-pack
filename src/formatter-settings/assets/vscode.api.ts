declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function formatCode(code: string) {
  vscode.postMessage({
    command: "format",
    code
  });
}
