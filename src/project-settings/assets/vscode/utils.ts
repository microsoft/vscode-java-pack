// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../../../utils/webview";
import { ClasspathEntry } from "../../types";

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

export namespace CommonRequest {
    export function onWillListProjects() {
        vscode.postMessage({
            command: "common.onWillListProjects",
        });
    }

    export function onWillExecuteCommand(id: string) {
        vscode.postMessage({
            command: "common.onWillExecuteCommand",
            id,
        });
    }
}

export namespace ClasspathRequest {
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

    export function onWillUpdateClassPaths(rootPath: string, projectType: ProjectType, sourcePaths: ClasspathEntry[], defaultOutputPath: string, vmInstallPath: string, libraries: ClasspathEntry[]) {
        vscode.postMessage({
            command: "classpath.onWillUpdateClassPaths",
            rootPath,
            projectType,
            sourcePaths,
            defaultOutputPath,
            vmInstallPath,
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

export namespace MavenRequest {
    export function onWillGetSelectedProfiles(uri: string) {
        vscode.postMessage({
            command: "maven.onWillGetSelectedProfiles",
            uri,
        });
    }

    export function onWillUpdateSelectProfiles(uri: string, selectedProfiles: string) {
        vscode.postMessage({
            command: "maven.onWillUpdateSelectProfiles",
            uri,
            selectedProfiles,
        });
    }
}

export namespace CompilerRequest {
    export function onWillGetAvailableComplianceLevels() {
        vscode.postMessage({
            command: "compiler.onWillGetAvailableComplianceLevels",
        });
    }

    export function onWillGetCompilerSettings(uri: string) {
        vscode.postMessage({
            command: "compiler.onWillGetCompilerSettings",
            uri,
        });
    }

    export function onWillUpdateCompilerSettings(uri: string, useRelease: boolean, enablePreview: boolean,
            complianceLevel: string, sourceLevel: string, targetLevel: string, generateDebugInfo: boolean,
            storeMethodParamNames: boolean) {
        vscode.postMessage({
            command: "compiler.onWillUpdateCompilerSettings",
            uri,
            useRelease,
            enablePreview,
            complianceLevel,
            sourceLevel,
            targetLevel,
            generateDebugInfo,
            storeMethodParamNames,
        });
    }
}
