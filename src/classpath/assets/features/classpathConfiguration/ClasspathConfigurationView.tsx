// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Output from "./components/Output";
import ProjectSelector from "./components/ProjectSelector";
import Sources from "./components/Sources";
import Libraries from "./components/Libraries";
import Exception from "./components/Exception";
import { ClasspathViewException, ProjectInfo, ClasspathEntry, VmInstall } from "../../../types";
import { catchException, listProjects, listVmInstalls, loadClasspath } from "./classpathConfigurationViewSlice";
import JdkRuntime from "./components/JdkRuntime";
import { onWillListProjects, onWillListVmInstalls } from "../../utils";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { ProjectType } from "../../../../utils/webview";
import UnmanagedFolderSources from "./components/UnmanagedFolderSources";
import Footer from "./components/Footer";

const ClasspathConfigurationView = (): JSX.Element => {
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType[state.classpathConfig.activeProjectIndex]);
  const exception: ClasspathViewException | undefined = useSelector((state: any) => state.classpathConfig.exception);
  let content: JSX.Element;

  if (exception) {
    content = <Exception />;
  } else if (projects.length === 0) {
    content = <VSCodeProgressRing></VSCodeProgressRing>;
  } else {
    content = (
      <div>
        <div className="mb-12">
          <ProjectSelector />
          <VSCodePanels className="setting-panels">
            <VSCodePanelTab id="source">Sources</VSCodePanelTab>
            <VSCodePanelTab id="jdk">JDK Runtime</VSCodePanelTab>
            <VSCodePanelTab id="libraries">Libraries</VSCodePanelTab>
            <VSCodePanelView className="setting-panels-view">
              {[ProjectType.Gradle, ProjectType.Maven].includes(projectType) && (<Sources />)}
              {projectType !== ProjectType.Gradle && projectType !== ProjectType.Maven && (<UnmanagedFolderSources />)}
              {projectType === ProjectType.UnmanagedFolder && (<Output />)}
            </VSCodePanelView>
            <VSCodePanelView className="setting-panels-view">
              <JdkRuntime />
            </VSCodePanelView>
            <VSCodePanelView className="setting-panels-view">
              <Libraries />
            </VSCodePanelView>
          </VSCodePanels>
        </div>
        <Footer />
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
    return () => {
      window.removeEventListener("message", onInitialize);
    }
  }, []);

  return (
    <div className="root">
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
    sources?: ClasspathEntry[];
    output?: string;
    libraries?: string[];
    exception?: ClasspathViewException;
  };
}

export default ClasspathConfigurationView;
