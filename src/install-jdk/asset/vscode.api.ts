// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();


export function onWillFetchAvailableReleases() {
  vscode.postMessage({
    command: "onWillFetchAvailableReleases"
  });
}

export function onWillDownloadTemurinJDK(url: string) {
  vscode.postMessage({
    command: "onWillDownloadTemurinJDK",
    payload: {
      url
    }
  });
}

export function onWillFetchAsset(majorVersion?: number) {
  vscode.postMessage({
    command: "onWillFetchAsset",
    payload: {
      majorVersion
    }
  });
}

export function onWillReloadWindow() {
  vscode.postMessage({
    command: "onWillReloadWindow",
  });
}
