// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export function encodeCommandUri(command: string, args?: string[]) {
  let ret = `command:${command}`;
  if (args && args.length > 0) {
    ret += `?${encodeURIComponent(JSON.stringify(args))}`;
  }
  return ret;
}

export function encodeCommandUriWithTelemetry(identifier: string, command: string, args?: any[]) {
  const helperCommand = "java.webview.runCommand";
  const wrappedArgs = {
    webview: WEBVIEW_ID,
    identifier,
    command,
    args
  };
  return `command:${helperCommand}?${encodeURIComponent(JSON.stringify(wrappedArgs))}`;
}

export const WEBVIEW_ID: string = "java.welcome";

// RPC calls to VS Code
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi && acquireVsCodeApi();

export function setWelcomeVisibility(visibility: boolean) {
  vscode.postMessage({
    command: "setWelcomeVisibility",
    visibility
  });
}

export function showWelcomePage(tour?: boolean) {
  vscode.postMessage({
    command: "showWelcomePage",
    firstTimeRun : tour
  });
}
