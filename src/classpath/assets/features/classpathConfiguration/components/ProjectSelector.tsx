// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo } from "../../../../types";
import { Col, Row } from "react-bootstrap";
import { Dispatch } from "@reduxjs/toolkit";
import { activeProjectChange } from "../classpathConfigurationViewSlice";
import { onClickGotoProjectConfiguration, onWillLoadProjectClasspath, WEBVIEW_ID } from "../../../utils";
import { encodeCommandUriWithTelemetry, ProjectType } from "../../../../../utils/webview";
import { Icon } from "@iconify/react";
import chevronDownIcon from "@iconify-icons/codicon/chevron-down";

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
      <Dropdown.Item className="dropdown-item py-0 pl-1" key={project.rootPath} onSelect={() => handleActiveProjectChange(index)}>
        {project.name}
      </Dropdown.Item>
    );
  });

  return (
    <Row className="setting-section">
      <Col>
        <span className="setting-section-description">Select the project folder.</span>
        <Dropdown className="mt-1">
          <Dropdown.Toggle className="dropdown-button flex-vertical-center text-left">
            <span>{projects[activeProjectIndex].name}</span>
            <Icon className="codicon" icon={chevronDownIcon} />
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu mt-0 p-0">
            {projectSelections}
          </Dropdown.Menu>
        </Dropdown>
        {(projectType === ProjectType.Gradle || projectType === ProjectType.Maven) &&
          <div className="mt-1">
            <span className="warning">
              Below settings are only editable for projects without build tools. For {projectType} project, please edit the <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, `classpath.open${projectType}Doc`, "java.helper.openUrl", [buildFileDocUrl])}>entries</a> in <a href="" onClick={() => handleOpenBuildFile()}>{buildFile}</a>.
            </span>
          </div>
        }
      </Col>
    </Row>
  );
};

export default ProjectSelector;
