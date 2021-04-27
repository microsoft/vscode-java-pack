// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { Col, Container, Row, Spinner } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Output from "./components/Output";
import ProjectSelector from "./components/ProjectSelector";
import Sources from "./components/Sources";
import ReferencedLibraries from "./components/ReferencedLibraries";
import Header from "./components/Header";
import Exception from "./components/Exception";
import { ClasspathViewException, ProjectInfo } from "../../../types";
import { catchException, listProjects, loadClasspath } from "./classpathConfigurationViewSlice";
import JdkRuntime from "./components/JdkRuntime";
import { onWillListProjects } from "../../utils";

const ClasspathConfigurationView = (): JSX.Element => {
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const exception: ClasspathViewException | undefined = useSelector((state: any) => state.classpathConfig.exception);
  let content: JSX.Element;

  if (exception) {
    content = <Exception />;
  } else if (projects.length === 0) {
    content = <Spinner animation="border" role="status" size="sm"><span className="sr-only">Loading...</span></Spinner>;
  } else {
    content = (
      <div>
        <ProjectSelector />
        <Row className="setting-section">
          <Col>
            <Sources />
          </Col>
        </Row>
        <Row className="setting-section">
          <Col>
            <Output />
          </Col>
        </Row>
        <Row className="setting-section">
          <Col>
            <JdkRuntime />
          </Col>
        </Row>
        <Row className="setting-section">
          <Col>
            <ReferencedLibraries />
          </Col>
        </Row>
      </div>
    );
  }

  const dispatch: Dispatch<any> = useDispatch();

  const onInitialize = (event: OnInitializeEvent) => {
    const {data} = event;
    if (data.command === "onDidListProjects") {
      dispatch(listProjects(data.projectInfo));
    } else if (data.command === "onDidLoadProjectClasspath") {
      dispatch(loadClasspath(data));
    } else if (data.command === "onException") {
      dispatch(catchException(data.exception));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onInitialize);
    onWillListProjects();
    return () => window.removeEventListener("message", onInitialize);
  }, []);

  return (
    <Container className="root mt-4">
      <Row className="setting-header">
        <Col>
          <Header />
        </Col>
      </Row>
      {content}
    </Container>
  );
};

interface OnInitializeEvent {
  data: {
    command: string;
    projectInfo?: {
      name: string;
      rootPath: string;
      projectType: string;
    }[];
    sources?: string[];
    output?: string;
    referencedLibraries?: string[];
    exception?: ClasspathViewException;
  };
}

export default ClasspathConfigurationView;
