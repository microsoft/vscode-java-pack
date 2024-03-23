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

export function onWillUpdateClassPaths(rootPaths: string[], projectTypes: ProjectType[], sourcePaths: ClasspathEntry[][], defaultOutputPaths: string[], vmInstallPaths: string[], libraries: ClasspathEntry[][]) {
  vscode.postMessage({
    command: "onWillUpdateClassPaths",
    rootPaths,
    projectTypes,
    sourcePaths,
    defaultOutputPaths,
    vmInstallPaths,
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

export function onWillAddNewJdk() {
  vscode.postMessage({
    command: "onWillAddNewJdk"
  });
}

export function onWillSelectLibraries() {
  vscode.postMessage({
    command: "onWillSelectLibraries"
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

// TODO: better way to handle the max height calculation?
export const updateMaxHeight = () => {
  let maxHeight = window.innerHeight;
  const projectSelector = document.getElementById("project-selector");
  if (projectSelector) {
    maxHeight -= projectSelector.getBoundingClientRect().height;
  }
  const footer = document.getElementById("footer");
  if (footer) {
    maxHeight -= footer.getBoundingClientRect().height;
  }
  maxHeight -= 120;
  const areas = Array.from(document.getElementsByClassName("setting-overflow-area") as HTMLCollectionOf<HTMLElement>);
  for (let i = 0; i < areas.length; i++) {
    areas[i].style!.maxHeight = (maxHeight <= 10 ? 10 : maxHeight) + "px";
  }
}