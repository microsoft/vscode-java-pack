// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClasspathConfigurationView from "../../classpath/features/ClasspathConfigurationView";
import { initializeClasspathData, updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import "../style.scss";
import { listProjects, updateActiveSection } from "./commonSlice";
import ProjectSelector from "./component/ProjectSelector";
import { VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import Footer from "./component/Footer";
import SideBar from "./component/SideBar";
import MavenConfigurationView from "../../maven/features/MavenConfigurationView";
import { SectionId } from "../../../types";
import { initializeMavenData } from "../../maven/features/mavenConfigurationViewSlice";

const ProjectSettingView = (): JSX.Element => {
  const activeSection: string = useSelector((state: any) => state.commonConfig.ui.activeSection);
  const dispatch: Dispatch<any> = useDispatch();

  React.useEffect(() => {
    window.addEventListener("message", onWillChangeRoute);
    return () => {
      window.removeEventListener("message", onWillChangeRoute);
    };
  }, []);

  const getSectionContent = () => {
    if (activeSection === SectionId.Classpath) {
      return <ClasspathConfigurationView />;
    } else if (activeSection === SectionId.Maven) {
      return <MavenConfigurationView />;
    }

    return null;
  }

  const onWillChangeRoute = (e: any) => {
    const { data } = e;
    if (data.command === "main.onWillChangeRoute") {
      const routes = data.route.split("/");
      dispatch(updateActiveSection(routes[0]));
      if (routes.length > 1) {
        switch (routes[0]) {
          case SectionId.Classpath:
            dispatch(updateActiveTab(routes[1]));
            break;
          default:
            break;
        }
      }
    } else if (data.command === "main.onDidListProjects") {
      dispatch(initializeClasspathData({ projectsNum: data.projectInfo?.length }));
      dispatch(initializeMavenData({ projectsNum: data.projectInfo?.length }));
      dispatch(listProjects(data.projectInfo));
    }
  }

  return (
    <div className="root">
      <ProjectSelector />
      <VSCodeDivider />
      <div className="app-container">
        <SideBar />
        <div className="app-frame">
          {getSectionContent()}
        </div>
      </div>
      <VSCodeDivider />
      <Footer />
    </div>

  );
};

export default ProjectSettingView;
