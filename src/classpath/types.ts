// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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

export enum ProjectType {
    Default = "Default project",
    UnmanagedFolder = "Unmanaged folder",
    Maven = "Maven",
    Gradle = "Gradle",
    Others = "Others",
}

export enum NatureId {
    Maven = "org.eclipse.m2e.core.maven2Nature",
    Gradle = "org.eclipse.buildship.core.gradleprojectnature",
    Java = "org.eclipse.jdt.core.javanature",
}

export enum ClasspathViewException {
    JavaExtensionNotInstalled = "javaExtensionNotInstalled",
    NoJavaProjects = "noJavaProjects",
}
