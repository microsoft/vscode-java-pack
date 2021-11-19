// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { ProjectType } from "./webview";
import * as vscode from "vscode";

export async function getProjectType(fsPath: string): Promise<ProjectType> {
    if (isDefaultProject(fsPath)) {
        return ProjectType.Default;
    }
    const buildDotGradleFile = path.join(fsPath, "build.gradle");
    if (await fse.pathExists(buildDotGradleFile)) {
      return ProjectType.Gradle;
    }
    const pomDotXmlFile = path.join(fsPath, "pom.xml");
    if (await fse.pathExists(pomDotXmlFile)) {
      return ProjectType.Maven;
    }
    const dotProjectFile = path.join(fsPath, ".project");
    if (!await fse.pathExists(dotProjectFile)) { // for invisible projects, .project file is located in workspace storage.
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
