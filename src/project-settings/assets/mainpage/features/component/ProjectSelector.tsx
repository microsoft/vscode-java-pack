// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo } from "../../../../types";
import { Dispatch } from "@reduxjs/toolkit";

import { activeProjectChange } from "../../../mainpage/features/commonSlice";
import { ClasspathRequest, CompilerRequest, MavenRequest } from "../../../vscode/utils";

const ProjectSelector = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);

  const dispatch: Dispatch<any> = useDispatch();

  const handleActiveProjectChange = (index: number) => {
    dispatch(activeProjectChange(index));
  };

  useEffect(() => {
    if (projects.length === 0) {
      return;
    }

    ClasspathRequest.onWillLoadProjectClasspath(projects[activeProjectIndex].rootPath);
    CompilerRequest.onWillGetCompilerSettings(projects[activeProjectIndex].rootPath);
    MavenRequest.onWillGetSelectedProfiles(projects[activeProjectIndex].rootPath);
  }, [activeProjectIndex, projects]);

  const projectSelections = projects.map((project, index) => {
    if (projects.length === 0) {
      return null;
    }

    return (
      <vscode-option className="setting-section-option" key={project.rootPath} onClick={() => handleActiveProjectChange(index)}>
        {project.name}
      </vscode-option>
    );
  });

  return (
    <div id="project-selector" className="setting-section">
      <div className="flex-center mt-2 mb-2">
        <span className="setting-section-description ml-1 mr-1">Project:</span>
        <vscode-single-select className="setting-section-dropdown">
            {projectSelections}
        </vscode-single-select>
      </div>
    </div>
  );
};

export default ProjectSelector;
