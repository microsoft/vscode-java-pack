// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-tabs/index.js";
import "@vscode-elements/elements/dist/vscode-tab-header/index.js";
import "@vscode-elements/elements/dist/vscode-tab-panel/index.js";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Output from "./components/Output";
import Sources from "./components/Sources";
import Libraries from "./components/Libraries";
import { listVmInstalls, updateActiveTab } from "./classpathConfigurationViewSlice";
import JdkRuntime from "./components/JdkRuntime";

import { ProjectType } from "../../../../utils/webview";
import UnmanagedFolderSources from "./components/UnmanagedFolderSources";
import Hint from "./components/Hint";
import "../style.scss";

const ClasspathConfigurationView = (): JSX.Element => {
  const activeTab: string = useSelector((state: any) => state.classpathConfig.ui.activeTab);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);
  const dispatch: Dispatch<any> = useDispatch();

  const tabIds = ["source", "jdk", "libraries"];
  const selectedIndex = Math.max(0, tabIds.indexOf(activeTab));

  const onClickTab = (tabId: string) => {
    dispatch(updateActiveTab(tabId));
  };

  const onMessage = (event: any) => {
    const { data } = event;
    if (data.command === "classpath.onDidListVmInstalls") {
      dispatch(listVmInstalls(data.vmInstalls))
    }
  };

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    }
  }, []);

  return (
    <div className="root">
      <vscode-tabs selected-index={selectedIndex} className="setting-panels">
        <vscode-tab-header slot="header" onClick={() => onClickTab("source")}>Sources</vscode-tab-header>
        <vscode-tab-header slot="header" onClick={() => onClickTab("jdk")}>JDK Runtime</vscode-tab-header>
        <vscode-tab-header slot="header" onClick={() => onClickTab("libraries")}>Libraries</vscode-tab-header>
        <vscode-tab-panel className="setting-panels-view">
          {[ProjectType.Gradle, ProjectType.Maven].includes(projectType) && (<Sources />)}
          {projectType !== ProjectType.Gradle && projectType !== ProjectType.Maven && (<UnmanagedFolderSources />)}
          {projectType === ProjectType.UnmanagedFolder && (<Output />)}
        </vscode-tab-panel>
        <vscode-tab-panel className="setting-panels-view">
          <JdkRuntime />
        </vscode-tab-panel>
        <vscode-tab-panel className="setting-panels-view">
          <Libraries />
        </vscode-tab-panel>
      </vscode-tabs>
      <Hint />
    </div>
  );
};

export default ClasspathConfigurationView;
