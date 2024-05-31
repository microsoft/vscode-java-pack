// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClasspathConfigurationView from "../../classpath/features/ClasspathConfigurationView";
import { initializeClasspathData, loadClasspath, updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import "../style.scss";
import { catchException, listProjects, setProjectType, updateActiveSection } from "./commonSlice";
import ProjectSelector from "./component/ProjectSelector";
import { VSCodeDivider, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import Footer from "./component/Footer";
import SideBar from "./component/SideBar";
import MavenConfigurationView from "../../maven/features/MavenConfigurationView";
import { ProjectSettingsException, ProjectInfo, SectionId } from "../../../types";
import { flushMavenSettingsToEffective, initializeMavenData, updateActiveProfiles } from "../../maven/features/mavenConfigurationViewSlice";
import CompilerConfigurationView from "../../compiler/features/CompilerConfigurationView";
import { flushCompilerSettingsToEffective, initializeCompilerData, updateCompilerSettings } from "../../compiler/features/compilerConfigurationViewSlice";
import Exception from "./component/Exception";
import { CommonRequest } from "../../vscode/utils";

const ProjectSettingView = (): JSX.Element => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const activeSection: string = useSelector((state: any) => state.commonConfig.ui.activeSection);
  const exception: ProjectSettingsException | undefined = useSelector((state: any) => state.commonConfig.ui.exception);
  const dispatch: Dispatch<any> = useDispatch();

  const onMessage = (e: any) => {
    const { data } = e;
    if (data.command === "main.onDidListProjects") {
      const length = data.projectInfo?.length;
      if (length) {
        dispatch(initializeClasspathData({ projectsNum: length }));
        dispatch(initializeCompilerData({ projectsNum: length }));
        dispatch(initializeMavenData({ projectsNum: length }));
      }
      dispatch(listProjects(data.projectInfo));
    } else if (data.command === "main.onWillChangeRoute") {
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
    } else if (data.command === "main.onException") {
      dispatch(catchException(data.exception));
    } else if (data.command === "classpath.onDidLoadProjectClasspath") {
      dispatch(setProjectType({
        projectType: data.projectType
      }));
      dispatch(loadClasspath({
        activeProjectIndex: activeProjectIndexRef.current,
        ...data
      }));
    } else if (data.command === "maven.onDidGetSelectedProfiles") {
      dispatch(updateActiveProfiles({
        activeProjectIndex: activeProjectIndexRef.current,
        activeProfiles: data.selectedProfiles
      }));
      dispatch(flushMavenSettingsToEffective({
        activeProjectIndex: activeProjectIndexRef.current,
      }));
    } else if (data.command === "compiler.onDidGetCompilerSettings") {
      dispatch(updateCompilerSettings({
        activeProjectIndex: activeProjectIndexRef.current,
        useRelease: data.useRelease,
        enablePreview: data.enablePreview,
        complianceLevel: data.complianceLevel,
        sourceLevel: data.sourceLevel,
        targetLevel: data.targetLevel,
        generateDebugInfo: data.generateDebugInfo,
        storeMethodParamNames: data.storeMethodParamNames
      }));
      dispatch(flushCompilerSettingsToEffective({
        activeProjectIndex: activeProjectIndexRef.current,
      }));
    }
  }

  React.useEffect(() => {
    window.addEventListener("message", onMessage);
    if (projects.length == 0) {
      // this makes sure the initialization only happens when the
      // redux store is empty. When switching between tabs, the
      // state will be preserved.
      CommonRequest.onWillListProjects();
    }
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const getSectionContent = () => {
    if (activeSection === SectionId.Classpath) {
      return <ClasspathConfigurationView />;
    } else if (activeSection === SectionId.Compiler) {
      return <CompilerConfigurationView />;
    } else if (activeSection === SectionId.Maven) {
      return <MavenConfigurationView />;
    }

    return null;
  }

  if (exception) {
    return <Exception />;
  } else if (projects.length === 0) {
    return <VSCodeProgressRing/>;
  } else {
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
  }
};

export default ProjectSettingView;
