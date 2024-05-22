// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo, ProjectState } from "../../../../types";
import { Dispatch } from "@reduxjs/toolkit";
import { ClasspathRequest } from "../../../vscode/utils";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { activeProjectChange } from "../../../mainpage/features/commonSlice";

const ProjectSelector = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectState: ProjectState[] = useSelector((state: any) => state.commonConfig.data.projectState);

  const dispatch: Dispatch<any> = useDispatch();

  const handleActiveProjectChange = (index: number) => {
    dispatch(activeProjectChange(index));
  };

  const loadProjectClasspath = (rootPath: string) => {
    if (projectState[activeProjectIndex] === ProjectState.Unloaded) {
      ClasspathRequest.onWillLoadProjectClasspath(rootPath);
    }
  }

  useEffect(() => {
    if (projects.length === 0) {
      return;
    }

    loadProjectClasspath(projects[activeProjectIndex].rootPath);
  }, [activeProjectIndex, projects]);

  const projectSelections = projects.map((project, index) => {
    if (projects.length === 0) {
      return null;
    }

    return (
      <VSCodeOption className="setting-section-option" key={project.rootPath} onClick={() => handleActiveProjectChange(index)}>
        {project.name}
      </VSCodeOption>
    );
  });

  return (
    <div id="project-selector" className="setting-section">
      <div className="flex-center mt-2 mb-2">
        <span className="setting-section-description ml-1 mr-1">Project:</span>
        <VSCodeDropdown className="setting-section-dropdown">
            {projectSelections}
        </VSCodeDropdown>
      </div>
    </div>
  );
};

export default ProjectSelector;
