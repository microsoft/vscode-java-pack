// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-divider/index.js";

import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateSource } from "../classpathConfigurationViewSlice";
import { ClasspathRequest } from "../../../vscode/utils";
import { ProjectType } from "../../../../../utils/webview";

import { ClasspathEntry } from "../../../../types";

const UnmanagedFolderSources = (): JSX.Element => {

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.sources[activeProjectIndex]);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (path: string) => {
    const updatedSources: ClasspathEntry[] = [];
    for (const sourceRoot of sources) {
      if (sourceRoot.path === path) {
        continue;
      }
      updatedSources.push(sourceRoot);
    }
    dispatch(updateSource({
      activeProjectIndex,
      sources: updatedSources
    }));
  };

  const handleAdd = () => {
    ClasspathRequest.onWillAddSourcePathForUnmanagedFolder();
  };

  const onDidUpdateSourceFolder = (event: OnDidAddSourceFolderEvent) => {
    const {data} = event;
    if (data.command === "classpath.onDidUpdateSourceFolder") {
      dispatch(updateSource({
        activeProjectIndex: activeProjectIndexRef.current,
        sources: data.sourcePaths.map(sp => {
          return {
            path: sp,
          };
        })
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidUpdateSourceFolder);
    return () => window.removeEventListener("message", onDidUpdateSourceFolder);
  }, []);

  let sourceSections: JSX.Element | JSX.Element[];
  if (sources.length === 0) {
    sourceSections = (
      <div className={`source-row ${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""}`}>
        <span><em>No source paths are configured.</em></span>
      </div>
    );
  } else {
    sourceSections = sources.map((source, index) => (
      <div className={`source-row ${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""}`} id={`sources-${index}`} onMouseEnter={() => setHoveredRow(`sources-${index}`)} onMouseLeave={() => setHoveredRow(null)}  key={source.path}>
        <div className="setting-section-grid-cell" style={{flex: 1}}>
           <span className="codicon codicon-folder mr-1"></span>
           <span>{source.path}</span>
        </div>
        <div className={`source-row-actions ${hoveredRow === `sources-${index}` && projectType === ProjectType.UnmanagedFolder ? "" : "hidden"}`}>
          <vscode-button class="ghost-button" icon-only onClick={() => handleRemove(source.path)} title="Remove">
              <span className="codicon codicon-close"></span>
          </vscode-button>
        </div>
      </div>
    ));
  }

  return (
    <div className="setting-section">
      <h4 className="mt-1 mb-1 pl-1">Source Paths</h4>
      <div id="list-actions" className="flex-center setting-list-actions">
        <vscode-button class="ghost-button" onClick={() => handleAdd()}>
          <span className="codicon codicon-add mr-1"></span>
          Add Source Root...
        </vscode-button>
      </div>
      <vscode-divider className="mb-0"/>
      <div className="setting-overflow-area">
        {sourceSections}
      </div>
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