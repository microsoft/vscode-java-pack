// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-divider/index.js";

import { Dispatch } from "@reduxjs/toolkit";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeReferencedLibrary, addLibraries } from "../classpathConfigurationViewSlice";
import { ClasspathRequest } from "../../../vscode/utils";

import { ClasspathEntry, ClasspathEntryKind } from "../../../../types";

const Libraries = (): JSX.Element => {

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const libraries: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.libraries[activeProjectIndex]);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (index: number) => {
    dispatch(removeReferencedLibrary({
      activeProjectIndex,
      removedIndex: index
    }));
  };

  const handleAdd = () => {
    ClasspathRequest.onWillSelectLibraries();
  };

  const onDidAddLibraries = (event: OnDidAddLibrariesEvent) => {
    const {data} = event;
    if (data.command === "classpath.onDidAddLibraries") {
      dispatch(addLibraries({
        activeProjectIndex: activeProjectIndexRef.current,
        libraries:data.jars
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidAddLibraries);
    return () => {
      window.removeEventListener("message", onDidAddLibraries);
    }
  }, []);

  const resolveLibPath = (entry: ClasspathEntry): string => {
    if (entry.kind === ClasspathEntryKind.Project) {
      return resolveProjectPath(entry);
    } else if (entry.attributes?.hasOwnProperty("maven.pomderived")) {
      return resolveMavenLibPath(entry);
    } else if (entry.attributes?.hasOwnProperty("gradle_used_by_scope")|| entry.attributes?.hasOwnProperty("gradle.buildServer")) {
      return resolveGradleLibPath(entry);
    }
    return entry.path;
  }

  const resolveProjectPath = (entry: ClasspathEntry): string => {
    return `Project: ${getLastPathComponent(entry.path)}`;
  }

  const resolveMavenLibPath = (entry: ClasspathEntry): string => {
    if (entry.attributes?.["maven.groupId"] && entry.attributes?.["maven.artifactId"] && entry.attributes?.["maven.version"]) {
      return `Maven: ${entry.attributes["maven.groupId"]}:${entry.attributes["maven.artifactId"]}:${entry.attributes["maven.version"]}`;
    }
    return entry.path;
  }

  const resolveGradleLibPath = (entry: ClasspathEntry): string => {
    return `Gradle: ${getLastPathComponent(entry.path)}`;
  }

  const getLastPathComponent = (path: string): string => {
    const pathComponents = path.split(/[\\/]/);
    return pathComponents[pathComponents.length - 1];
  }

  let librariesSections: JSX.Element | JSX.Element[];
  if (libraries.length === 0) {
    librariesSections = (
      <div className="source-row">
        <span><em>No libraries are configured.</em></span>
      </div>
    );
  } else {
    librariesSections = libraries.map((library, index) => (
      <div className="source-row" id={`library-${index}`} onMouseEnter={() => setHoveredRow(`library-${index}`)} onMouseLeave={() => setHoveredRow(null)}  key={library.path}>
        <div title={library.path} className="setting-section-grid-cell" style={{flex: 1}}>
          <span className={`codicon ${library.kind === 2 ? "codicon-project" : "codicon-library"} mr-1`}></span>
          <span>{resolveLibPath(library)}</span>
        </div>
        <div className={`source-row-actions ${hoveredRow === `library-${index}` ? "" : "hidden"}`}>
          <vscode-button class="ghost-button" icon-only onClick={() => handleRemove(index)} title="Remove">
            <span className="codicon codicon-close"></span>
          </vscode-button>
        </div>
      </div>
    ));
  }

  return (
    <div className="setting-section">
      <div>
        <div id="list-actions" className="flex-center setting-list-actions">
          <vscode-button class="ghost-button" onClick={() => handleAdd()}>
            <span className="codicon codicon-add mr-1"></span>
            Add Library...
          </vscode-button>
        </div>
        <vscode-divider className="mb-0"/>
        <div className="setting-overflow-area">
          {librariesSections}
        </div>
      </div>
    </div>
  );
};

interface OnDidAddLibrariesEvent {
  data: {
    command: string;
    jars: ClasspathEntry[];
  };
}

export default Libraries;
