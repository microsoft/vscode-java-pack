// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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

/**
 * Request main process to fetch init properties for welcome page.
 */
export function onWillFetchInitProps() {
  vscode.postMessage({
    command: "onWillFetchInitProps"
  });
}
