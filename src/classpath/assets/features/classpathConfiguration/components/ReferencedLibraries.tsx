// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeReferencedLibrary, addReferencedLibraries } from "../classpathConfigurationViewSlice";
import { onWillAddReferencedLibraries, onWillRemoveReferencedLibraries } from "../../../utils";
import { ProjectType } from "../../../../../utils/webview";
import { VSCodeButton, VSCodeDataGrid, VSCodeDataGridRow } from "@vscode/webview-ui-toolkit/react";
import SectionHeader from "./common/SectionHeader";

const ReferencedLibraries = (): JSX.Element => {

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const referencedLibraries: string[] = useSelector((state: any) => state.classpathConfig.referencedLibraries);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (index: number) => {
    onWillRemoveReferencedLibraries(referencedLibraries[index]);
    dispatch(removeReferencedLibrary(index));
  };

  const handleAdd = () => {
    onWillAddReferencedLibraries();
  };

  const onDidAddReferencedLibraries = (event: OnDidAddReferencedLibrariesEvent) => {
    const {data} = event;
    if (data.command === "onDidAddReferencedLibraries") {
      dispatch(addReferencedLibraries(data.jars));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidAddReferencedLibraries);
    return () => window.removeEventListener("message", onDidAddReferencedLibraries);
  }, []);

  let referencedLibrariesSections: JSX.Element | JSX.Element[];
  if (referencedLibraries.length === 0) {
    referencedLibrariesSections = (
      <VSCodeDataGridRow className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-grid-row`}>
        <span><em>No referenced libraries are configured.</em></span>
      </VSCodeDataGridRow>
    );
  } else {
    referencedLibrariesSections = referencedLibraries.map((library, index) => (
      <VSCodeDataGridRow className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-grid-row`} id={`library-${index}`} onMouseEnter={() => setHoveredRow(`library-${index}`)} onMouseLeave={() => setHoveredRow(null)}  key={library}>
        <span>{library}</span>
        {hoveredRow === `library-${index}` && projectType === ProjectType.UnmanagedFolder && (
          <VSCodeButton appearance='icon' onClick={() => handleRemove(index)}>
            <span className="codicon codicon-close"></span>
          </VSCodeButton>
        )}
      </VSCodeDataGridRow>
    ));
  }

  return (
    <div className="setting-section">
      <SectionHeader title="Referenced Libraries" subTitle={projectType !== ProjectType.UnmanagedFolder ? "(Read-only)" : undefined} />
      <span className="setting-section-description">Specify referenced libraries of the project.</span>
      <div className="setting-section-target">
        <VSCodeDataGrid>
          <VSCodeDataGridRow className="setting-section-grid-row" rowType="header">
            <span className=" setting-section-grid-row-header">Path</span>
          </VSCodeDataGridRow>
          {referencedLibrariesSections}
        </VSCodeDataGrid>
      </div>
      {projectType === ProjectType.UnmanagedFolder &&
        <VSCodeButton onClick={() => handleAdd()}>Add</VSCodeButton>
      }
    </div>
  );
};

interface OnDidAddReferencedLibrariesEvent {
  data: {
    command: string;
    jars: string[];
  };
}

export default ReferencedLibraries;
