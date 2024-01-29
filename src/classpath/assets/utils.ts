// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../../utils/webview";
import { ClasspathEntry } from "../types";

export const WEBVIEW_ID = "java.classpathConfiguration";

// RPC calls to VS Code
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi && acquireVsCodeApi();

export function onWillListProjects() {
  vscode.postMessage({
    command: "onWillListProjects",
  });
}

export function onWillListVmInstalls() {
  vscode.postMessage({
    command: "onWillListVmInstalls",
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

export function onWillSetOutputPath(outputPath: string) {
  vscode.postMessage({
    command: "onWillSetOutputPath",
    outputPath,
  });

}

export function onWillUpdateClassPaths(sourcePaths: ClasspathEntry[], vmInstallPath: string, libraries: ClasspathEntry[]) {
  vscode.postMessage({
    command: "onWillUpdateClassPaths",
    sourcePaths,
    vmInstallPath,
    libraries
  });

}

export function onWillRemoveSourcePath(sourcePaths: string[]) {
  vscode.postMessage({
    command: "onWillRemoveSourcePath",
    sourcePaths,
  });
}

export function onWillSelectFolder(type: string) {
  vscode.postMessage({
    command: "onWillSelectFolder",
    type,
  });
}

export function onWillAddSourcePathForUnmanagedFolder() {
  vscode.postMessage({
    command: "onWillAddSourcePathForUnmanagedFolder"
  });
}

export function onWillUpdateSourcePathsForUnmanagedFolder(sourcePaths: string[]) {
  vscode.postMessage({
    command: "onWillUpdateSourcePathsForUnmanagedFolder",
    sourcePaths
  });

}

export function onWillAddNewJdk() {
  vscode.postMessage({
    command: "onWillAddNewJdk"
  });
}

export function onWillChangeJdk(jdkPath: string) {
  vscode.postMessage({
    command: "onWillChangeJdk",
    jdkPath,
  });
}

export function onWillSelectLibraries() {
  vscode.postMessage({
    command: "onWillSelectLibraries"
  });
}

export function onWillUpdateUnmanagedFolderLibraries(jarFilePaths: string[]) {
  vscode.postMessage({
    command: "onWillUpdateUnmanagedFolderLibraries",
    jarFilePaths,
  });

}

export function onClickGotoProjectConfiguration(rootUri: string, projectType: ProjectType) {
  vscode.postMessage({
    command: "onClickGotoProjectConfiguration",
    rootUri,
    projectType,
  });
}

export function onWillExecuteCommand(id: string) {
  vscode.postMessage({
    command: "onWillExecuteCommand",
    id,
  });
}
