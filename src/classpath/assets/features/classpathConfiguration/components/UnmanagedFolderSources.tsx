// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateSource } from "../classpathConfigurationViewSlice";
import { onWillAddSourcePathForUnmanagedFolder } from "../../../utils";
import { ProjectType } from "../../../../../utils/webview";
import { VSCodeButton, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow } from "@vscode/webview-ui-toolkit/react";
import { ClasspathEntry } from "../../../../types";

const UnmanagedFolderSources = (): JSX.Element => {

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.sources);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (path: string) => {
    const updatedSources: ClasspathEntry[] = [];
    for (const sourceRoot of sources) {
      if (sourceRoot.path === path) {
        continue;
      }
      updatedSources.push(sourceRoot);
    }
    dispatch(updateSource(updatedSources));
  };

  const handleAdd = () => {
    onWillAddSourcePathForUnmanagedFolder();
  };

  const onDidUpdateSourceFolder = (event: OnDidAddSourceFolderEvent) => {
    const {data} = event;
    if (data.command === "onDidUpdateSourceFolder") {
      dispatch(updateSource(data.sourcePaths.map(sp => {
        return {
            path: sp,
        };
      })));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidUpdateSourceFolder);
    return () => window.removeEventListener("message", onDidUpdateSourceFolder);
  }, []);

  let sourceSections: JSX.Element | JSX.Element[];
  if (sources.length === 0) {
    sourceSections = (
      <VSCodeDataGridRow className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-grid-row`}>
        <span><em>No source paths are configured.</em></span>
      </VSCodeDataGridRow>
    );
  } else {
    sourceSections = sources.map((source, index) => (
      <VSCodeDataGridRow className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-grid-row`} id={`sources-${index}`} onMouseEnter={() => setHoveredRow(`sources-${index}`)} onMouseLeave={() => setHoveredRow(null)}  key={source.path}>
        <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-readonly" gridColumn="1">
          <div className="setting-section-grid-cell">
             <span className={"codicon codicon-folder mr-1"}></span>
             <span>{source.path}</span>
           </div>
          {hoveredRow === `sources-${index}` && projectType === ProjectType.UnmanagedFolder && (
            <VSCodeButton appearance='icon' onClick={() => handleRemove(source.path)}>
                <span className="codicon codicon-close"></span>
            </VSCodeButton>
          )}
        </VSCodeDataGridCell>
      </VSCodeDataGridRow>
    ));
  }

  return (
    <div className="setting-section">
      <h4 className="mt-2 mb-2 pl-1">Source Paths</h4>
      <div className="pt-1 pb-1">
        <VSCodeButton className="pl-1 pr-1 pt-1 pb-1" slot="end" appearance="icon" onClick={() => handleAdd()}>
          <span className="codicon codicon-add mr-1"></span>
          Add Source Root
        </VSCodeButton>
      </div>
      <VSCodeDataGrid>
        {sourceSections}
      </VSCodeDataGrid>
    </div>
  );
};

interface OnDidAddSourceFolderEvent {
  data: {
    command: string;
    sourcePaths: string[];
  };
}

export default UnmanagedFolderSources;