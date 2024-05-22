// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Output from "./components/Output";
import Sources from "./components/Sources";
import Libraries from "./components/Libraries";
import Exception from "./components/Exception";
import { ClasspathViewException, ProjectInfo } from "../../../types";
import { catchException, listVmInstalls, loadClasspath, updateActiveTab } from "./classpathConfigurationViewSlice";
import JdkRuntime from "./components/JdkRuntime";
import { ClasspathRequest } from "../../vscode/utils";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { ProjectType } from "../../../../utils/webview";
import UnmanagedFolderSources from "./components/UnmanagedFolderSources";
import Hint from "./components/Hint";
import "../style.scss";
import { setProjectType } from "../../mainpage/features/commonSlice";

const ClasspathConfigurationView = (): JSX.Element => {
  const activeTab: string = useSelector((state: any) => state.classpathConfig.ui.activeTab);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);
  const exception: ClasspathViewException | undefined = useSelector((state: any) => state.classpathConfig.exception);
  const dispatch: Dispatch<any> = useDispatch();

  const onClickTab = (tabId: string) => {
    dispatch(updateActiveTab(tabId));
  };

  let content: JSX.Element;
  if (exception) {
    content = <Exception />;
  } else if (projects.length === 0) {
    content = <VSCodeProgressRing></VSCodeProgressRing>;
  } else {
    content = (
      <div className="root">
        <VSCodePanels activeid={activeTab} className="setting-panels">
          <VSCodePanelTab id="source" onClick={() => onClickTab("source")}>Sources</VSCodePanelTab>
          <VSCodePanelTab id="jdk" onClick={() => onClickTab("jdk")}>JDK Runtime</VSCodePanelTab>
          <VSCodePanelTab id="libraries" onClick={() => onClickTab("libraries")}>Libraries</VSCodePanelTab>
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
        <Hint />
      </div>
    );
  }

  const onMessage = (event: any) => {
    const { data } = event;
    if (data.command === "classpath.onDidListVmInstalls") {
      dispatch(listVmInstalls(data.vmInstalls))
    } else if (data.command === "classpath.onDidLoadProjectClasspath") {
      dispatch(setProjectType({
        projectType: data.projectType
      }));
      dispatch(loadClasspath({
        activeProjectIndex,
        ...data
      }));
    } else if (data.command === "classpath.onException") {
      dispatch(catchException(data.exception));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    if (projects.length == 0) {
      // this makes sure the initialization only happens when the
      // redux store is empty. When switching between tabs, the
      // state will be preserved.
      ClasspathRequest.onWillListProjects();
    }
    return () => {
      window.removeEventListener("message", onMessage);
    }
  }, []);

  return content;
};

export default ClasspathConfigurationView;
