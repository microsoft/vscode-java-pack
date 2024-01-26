// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import { NatureId, ProjectType } from "./webview";
import * as vscode from "vscode";

export function getProjectType(fsPath: string, natureIds: string[]): ProjectType {
    if (isDefaultProject(fsPath)) {
        return ProjectType.Default;
    }

    if (natureIds.includes(NatureId.Gradle) || natureIds.includes(NatureId.GradleBs)) {
      return ProjectType.Gradle;
    }
    if (natureIds.includes(NatureId.Maven)){
      return ProjectType.Maven;
    }
    if (natureIds.includes(NatureId.UnmanagedFolder)) {
      return ProjectType.UnmanagedFolder;
    }
    return ProjectType.Others;
}

export function isDefaultProject(path: string): boolean {
    return path.indexOf("jdt.ls-java-project") > -1;
}

export function getProjectNameFromUri(uri: string): string {
  return path.basename(vscode.Uri.parse(uri).fsPath);
}
