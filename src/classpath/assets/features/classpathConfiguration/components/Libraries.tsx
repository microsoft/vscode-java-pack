// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeReferencedLibrary, addLibraries } from "../classpathConfigurationViewSlice";
import { onWillSelectLibraries } from "../../../utils";
import { VSCodeButton, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import { ClasspathEntry, ClasspathEntryKind } from "../../../../types";

const Libraries = (): JSX.Element => {

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const libraries: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.libraries[state.classpathConfig.activeProjectIndex]);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (index: number) => {
    dispatch(removeReferencedLibrary(index));
  };

  const handleAdd = () => {
    onWillSelectLibraries();
  };

  const onDidAddLibraries = (event: OnDidAddLibrariesEvent) => {
    const {data} = event;
    if (data.command === "onDidAddLibraries") {
      dispatch(addLibraries(data.jars));
    }
  };

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

  useEffect(() => {
    window.addEventListener("message", onDidAddLibraries);
    return () => {
      window.removeEventListener("message", onDidAddLibraries);
    }
  }, []);

  let librariesSections: JSX.Element | JSX.Element[];
  if (libraries.length === 0) {
    librariesSections = (
      <VSCodeDataGridRow className="setting-section-grid-row">
        <span><em>No libraries are configured.</em></span>
      </VSCodeDataGridRow>
    );
  } else {
    librariesSections = libraries.map((library, index) => (
      <VSCodeDataGridRow className="setting-section-grid-row" id={`library-${index}`} onMouseEnter={() => setHoveredRow(`library-${index}`)} onMouseLeave={() => setHoveredRow(null)}  key={library.path}>
        <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-readonly" gridColumn="1">
          <div title={library.path} className="setting-section-grid-cell">
            <span className={`codicon ${library.kind === 2 ? "codicon-project" : "codicon-library"} mr-1`}></span>
            <span>{resolveLibPath(library)}</span>
          </div>
          {hoveredRow === `library-${index}` && (
            <VSCodeButton appearance='icon' onClick={() => handleRemove(index)}>
              <span className="codicon codicon-close"></span>
            </VSCodeButton>
          )}
        </VSCodeDataGridCell>
      </VSCodeDataGridRow>
    ));
  }

  return (
    <div className="setting-section">
      <div>
        <div id="list-actions" className="flex-center setting-list-actions">
          <VSCodeButton className="pl-1 pr-1 pt-1 pb-1" slot="end" appearance="icon" onClick={() => handleAdd()}>
            <span className="codicon codicon-add mr-1"></span>
            Add Library...
          </VSCodeButton>
        </div>
        <VSCodeDivider className="mb-0"/>
        <div className="setting-overflow-area">
          <VSCodeDataGrid>
            {librariesSections}
          </VSCodeDataGrid>
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
