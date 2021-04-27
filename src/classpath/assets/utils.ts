// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../../utils/webview";

export const WEBVIEW_ID = "java.classpathConfiguration";

// RPC calls to VS Code
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi && acquireVsCodeApi();

export function onWillListProjects() {
  vscode.postMessage({
    command: "onWillListProjects",
  });
}

export function onWillLoadProjectClasspath(uri: string) {
  vscode.postMessage({
    command: "onWillLoadProjectClasspath",
    uri,
  });
}

export function onWillSelectOutputPath() {
  vscode.postMessage({
    command: "onWillSelectOutputPath"
  });
}

export function onWillRemoveSourcePath(sourcePaths: string[]) {
  vscode.postMessage({
    command: "onWillRemoveSourcePath",
    sourcePaths,
  });
}

export function onWillAddSourcePath() {
  vscode.postMessage({
    command: "onWillAddSourcePath"
  });
}

export function onWillAddReferencedLibraries() {
  vscode.postMessage({
    command: "onWillAddReferencedLibraries"
  });
}

export function onWillRemoveReferencedLibraries(path: string) {
  vscode.postMessage({
    command: "onWillRemoveReferencedLibraries",
    path,
  });
}

export function onClickGotoProjectConfiguration(rootUri: string, projectType: ProjectType) {
  vscode.postMessage({
    command: "onClickGotoProjectConfiguration",
    rootUri,
    projectType,
  });
}
