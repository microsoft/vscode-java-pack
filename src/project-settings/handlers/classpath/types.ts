// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectType } from "../../../utils/webview";

export interface ProjectInfo {
    name: string;
    rootPath: string;
}

export interface VmInstall {
    typeName: string;
    name: string;
    path: string;
    version: string;
}

export interface ClasspathComponent {
    projectType: ProjectType;
    sourcePaths: ClasspathEntry[];
    defaultOutputPath: string;
    jdkPath: string;
    libraries: ClasspathEntry[];
}

export interface ClasspathEntry {
    kind: ClasspathEntryKind;
    path: string;
    output?: string;
    attributes?: { [key: string]: string }
}

export enum ClasspathEntryKind {
    Library = 1,
    Project = 2,
    Source = 3,
    Variable = 4,
    Container = 5,
}

export enum ClasspathViewException {
    JavaExtensionNotInstalled = "javaExtensionNotInstalled",
    StaleJavaExtension = "staleJavaExtension",
    NoJavaProjects = "noJavaProjects",
}

export enum ProjectState {
    Unloaded = "unloaded",
    Loaded = "loaded",
}