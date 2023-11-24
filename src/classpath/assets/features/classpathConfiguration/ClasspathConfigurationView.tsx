// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Output from "./components/Output";
import ProjectSelector from "./components/ProjectSelector";
import Sources from "./components/Sources";
import ReferencedLibraries from "./components/ReferencedLibraries";
import Header from "./components/Header";
import Exception from "./components/Exception";
import { ClasspathViewException, ProjectInfo, VmInstall } from "../../../types";
import { catchException, listProjects, listVmInstalls, loadClasspath } from "./classpathConfigurationViewSlice";
import JdkRuntime from "./components/JdkRuntime";
import { onWillListProjects, onWillListVmInstalls } from "../../utils";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";

const ClasspathConfigurationView = (): JSX.Element => {
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const exception: ClasspathViewException | undefined = useSelector((state: any) => state.classpathConfig.exception);
  let content: JSX.Element;

  if (exception) {
    content = <Exception />;
  } else if (projects.length === 0) {
    content = <VSCodeProgressRing></VSCodeProgressRing>;
  } else {
    content = (
      <div>
        <ProjectSelector />
        <Sources />
        <Output />
        <JdkRuntime />
        <ReferencedLibraries />
      </div>
    );
  }

  const dispatch: Dispatch<any> = useDispatch();

  const onInitialize = (event: OnInitializeEvent) => {
    const {data} = event;
    if (data.command === "onDidListProjects") {
      dispatch(listProjects(data.projectInfo));
    } else if (data.command === "onDidListVmInstalls") {
      dispatch(listVmInstalls(data.vmInstalls))
    } else if (data.command === "onDidLoadProjectClasspath") {
      dispatch(loadClasspath(data));
    } else if (data.command === "onException") {
      dispatch(catchException(data.exception));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onInitialize);
    onWillListProjects();
    onWillListVmInstalls();
    return () => window.removeEventListener("message", onInitialize);
  }, []);

  return (
    <div className="root">
      <Header />
      {content}
    </div>
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
    vmInstalls?: VmInstall[];
    sources?: string[];
    output?: string;
    referencedLibraries?: string[];
    exception?: ClasspathViewException;
  };
}

export default ClasspathConfigurationView;
