// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo } from "../../../../types";
import { Dispatch } from "@reduxjs/toolkit";
import { activeProjectChange } from "../classpathConfigurationViewSlice";
import { onClickGotoProjectConfiguration, onWillLoadProjectClasspath } from "../../../utils";
import { ProjectType } from "../../../../../utils/webview";
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

const ProjectSelector = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.classpathConfig.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  let buildFile: string = "";
  if (projectType === ProjectType.Maven) {
    buildFile = "pom.xml";
  } else if (projectType === ProjectType.Gradle) {
    buildFile = "build.gradle";
  }

  const dispatch: Dispatch<any> = useDispatch();

  const handleActiveProjectChange = (index: number) => {
    dispatch(activeProjectChange(index));
  };

  const handleOpenBuildFile = () => {
    onClickGotoProjectConfiguration(projects[activeProjectIndex].rootPath, projectType);
  };

  useEffect(() => {
    onWillLoadProjectClasspath(projects[activeProjectIndex].rootPath);
  }, [activeProjectIndex, projects]);

  const projectSelections = projects.map((project, index) => {
    return (
      <VSCodeOption className="setting-section-option" key={project.rootPath} onClick={() => handleActiveProjectChange(index)}>
        {project.name}
      </VSCodeOption>
    );
  });

  return (
    <div className="setting-section">
      <span className="setting-section-description">Select the project.</span>
      <div className="setting-section-target">
        <VSCodeDropdown className="setting-section-dropdown">
          {projectSelections}
        </VSCodeDropdown>
      </div>

      {(projectType === ProjectType.Gradle || projectType === ProjectType.Maven) &&
        <div className="setting-section-target">
          <span className="setting-section-warning">
            '{projects[activeProjectIndex].name}' is imported by {projectType}, changes made to the classpath might be lost after reloading.
            To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
          </span>
        </div>
      }
    </div>
  );
};

export default ProjectSelector;
