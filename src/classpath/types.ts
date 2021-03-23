// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../utils/webview";

export interface ProjectInfo {
    name: string;
    rootPath: string;
}

export interface ClasspathComponent {
    projectType: ProjectType;
    sourcePaths: string[];
    defaultOutputPath: string;
    referenceLibraries: string[];
}

export enum ClasspathViewException {
    JavaExtensionNotInstalled = "javaExtensionNotInstalled",
    StaleJavaExtension = "staleJavaExtension",
    NoJavaProjects = "noJavaProjects",
}
