// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface JavaRuntimeEntry {
  name: string;
  fspath: string;
  type: string;
  majorVersion: number;
}

export interface JdkData {
  os: string;
  arch: string;
  name: string;
  size: string;
  downloadLink: string;
}

export interface ProjectRuntimeEntry {
  name: string;
  rootPath: string;
  runtimePath: string;
  sourceLevel: string;
  projectType: ProjectType;
}

export enum ProjectType {
  Default = "Default project",
  NoBuildTools = "No build tools",
  Maven = "Maven",
  Gradle = "Gradle",
  Others = "Others",
}

export enum NatureId {
  Maven = "org.eclipse.m2e.core.maven2Nature",
  Gradle = "org.eclipse.buildship.core.gradleprojectnature",
  Java = "org.eclipse.jdt.core.javanature",
}
