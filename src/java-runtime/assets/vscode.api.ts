// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export function udpateJavaHome(javaHome: string) {
  vscode.postMessage({
    command: "updateJavaHome",
    javaHome
  });
}

export function updateRuntimePath(sourceLevel: string, runtimePath: string) {
  vscode.postMessage({
    command: "updateRuntimePath",
    sourceLevel,
    runtimePath
  });
}

export function setDefaultRuntime(runtimePath: string, majorVersion: number) {
  vscode.postMessage({
    command: "setDefaultRuntime",
    runtimePath,
    majorVersion
  });
}

export function openBuildScript(rootUri: string, scriptFile: string) {
  vscode.postMessage({
    command: "openBuildScript",
    rootUri,
    scriptFile
  });
}

export function onWillListRuntimes() {
  vscode.postMessage({
    command: "onWillListRuntimes"
  });
}

export function onWillBrowseForJDK() {
  vscode.postMessage({
    command: "onWillBrowseForJDK"
  });
}

export function onWillRunCommandFromWebview(webview: string, identifier: string, command: string, args?: any[]) {
  vscode.postMessage({
    command: "onWillRunCommandFromWebview",
    wrappedArgs: {
      webview,
      identifier,
      command,
      args
    }
  });
}