// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../../../utils/webview";
import { ClasspathEntry } from "../../handlers/classpath/types";

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export namespace CommonRequest {
    export function onWillExecuteCommand(id: string) {
        vscode.postMessage({
            command: "common.onWillExecuteCommand",
            id,
        });
    }
}

export namespace ClasspathRequest {
    export function onWillListProjects() {
        vscode.postMessage({
            command: "classpath.onWillListProjects",
        });
    }

    export function onWillListVmInstalls() {
        vscode.postMessage({
            command: "classpath.onWillListVmInstalls",
        });
    }

    export function onWillLoadProjectClasspath(uri: string) {
        vscode.postMessage({
            command: "classpath.onWillLoadProjectClasspath",
            uri,
        });
    }

    export function onWillSelectOutputPath() {
        vscode.postMessage({
            command: "classpath.onWillSelectOutputPath"
        });
    }

    export function onWillUpdateClassPaths(rootPaths: string[], projectTypes: ProjectType[], sourcePaths: ClasspathEntry[][], defaultOutputPaths: string[], vmInstallPaths: string[], libraries: ClasspathEntry[][]) {
        vscode.postMessage({
            command: "classpath.onWillUpdateClassPaths",
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
            command: "classpath.onWillRemoveSourcePath",
            sourcePaths,
        });
    }

    export function onWillSelectFolder(type: string) {
        vscode.postMessage({
            command: "classpath.onWillSelectFolder",
            type,
        });
    }

    export function onWillAddSourcePathForUnmanagedFolder() {
        vscode.postMessage({
            command: "classpath.onWillAddSourcePathForUnmanagedFolder"
        });
    }

    export function onWillAddNewJdk() {
        vscode.postMessage({
            command: "classpath.onWillAddNewJdk"
        });
    }

    export function onWillSelectLibraries() {
        vscode.postMessage({
            command: "classpath.onWillSelectLibraries"
        });
    }

    export function onClickGotoProjectConfiguration(rootUri: string, projectType: ProjectType) {
        vscode.postMessage({
            command: "classpath.onClickGotoProjectConfiguration",
            rootUri,
            projectType,
        });
    }
}
