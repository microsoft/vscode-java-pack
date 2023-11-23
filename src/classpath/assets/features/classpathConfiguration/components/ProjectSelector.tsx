// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo } from "../../../../types";
import { Dispatch } from "@reduxjs/toolkit";
import { activeProjectChange } from "../classpathConfigurationViewSlice";
import { onClickGotoProjectConfiguration, onWillLoadProjectClasspath, WEBVIEW_ID } from "../../../utils";
import { encodeCommandUriWithTelemetry, ProjectType } from "../../../../../utils/webview";
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

const ProjectSelector = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.classpathConfig.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  let buildFile: string = "";
  let buildFileDocUrl: string = "";
  if (projectType === ProjectType.Maven) {
    buildFile = "pom.xml";
    buildFileDocUrl = "https://maven.apache.org/pom.html#directories";
  } else if (projectType === ProjectType.Gradle) {
    buildFile = "build.gradle";
    buildFileDocUrl = "https://docs.gradle.org/current/userguide/java_plugin.html#source_sets";
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
      <VSCodeOption key={project.rootPath} onClick={() => handleActiveProjectChange(index)}>
        {project.name}
      </VSCodeOption>
    );
  });

  return (
    <div className="setting-section">
      <span className="setting-section-description">Select the project folder.</span>
      <div className="setting-section-target">
        <VSCodeDropdown className="setting-section-dropdown">
          {projectSelections}
        </VSCodeDropdown>
      </div>

      {(projectType === ProjectType.Gradle || projectType === ProjectType.Maven) &&
        <div className="setting-section-target">
          <span className="setting-section-warning">
            Below settings are only editable for projects without build tools. For {projectType} project, please edit the <VSCodeLink href={encodeCommandUriWithTelemetry(WEBVIEW_ID, `classpath.open${projectType}Doc`, "java.helper.openUrl", [buildFileDocUrl])}>entries</VSCodeLink> in <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink>.
          </span>
        </div>
      }
    </div>
  );
};

export default ProjectSelector;
