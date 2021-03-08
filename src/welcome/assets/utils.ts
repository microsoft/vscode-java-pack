// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export function encodeCommandUri(command: string, args?: string[]) {
  let ret = `command:${command}`;
  if (args && args.length > 0) {
    ret += `?${encodeURIComponent(JSON.stringify(args))}`;
  }
  return ret;
}

/**
 * URL for webview commands. 
 * By executing the retured command, telemetry is sent before finally executing {command} {args}.
 * 
 * @param identifier will be record in telemetry
 * @param command command to execute
 * @param args must be an array, if provided
 * @returns 
 */
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

/**
 * Check if navigator.platform matches os.
 * @param os "win", "linux", "mac"
 */
export function supportedByNavigator(os: string): boolean {
  return navigator.platform.toLowerCase().indexOf(os.toLowerCase()) === 0;
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

export function reportTabSwitch(from: string, to: string) {
  vscode.postMessage({
    command: "sendInfo",
    data: {
      name: "switchTabs",
      from,
      to
    }
  });
}

export function reportSkipTour(from: string) {
  vscode.postMessage({
    command: "sendInfo",
    data: {
      name: "skipTour",
      from
    }
  });
}
