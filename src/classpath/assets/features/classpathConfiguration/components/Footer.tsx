// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeButton, VSCodeDivider, VSCodeLink} from "@vscode/webview-ui-toolkit/react";
import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { ClasspathEntry, ProjectInfo } from "../../../../types";
import { useDispatch, useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { onClickGotoProjectConfiguration, onWillUpdateClassPaths, updateMaxHeight } from "../../../utils";
import { updateLoadingState } from "../classpathConfigurationViewSlice";

const Footer = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.classpathConfig.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const sources: ClasspathEntry[][] = useSelector((state: any) => state.classpathConfig.sources);
  const defaultOutput: string[] = useSelector((state: any) => state.classpathConfig.output);
  const activeVmInstallPath: string[] = useSelector((state: any) => state.classpathConfig.activeVmInstallPath);
  const projectType: ProjectType[] = useSelector((state: any) => state.classpathConfig.projectType);
  const libraries: ClasspathEntry[][] = useSelector((state: any) => state.classpathConfig.libraries);
  const loadingState: boolean = useSelector((state: any) => state.classpathConfig.loadingState);

  const dispatch: Dispatch<any> = useDispatch();

  let buildFile: string = "";
  if (projectType[activeProjectIndex] === ProjectType.Maven) {
    buildFile = "pom.xml";
  } else if (projectType[activeProjectIndex] === ProjectType.Gradle) {
    buildFile = "build.gradle";
  }

  const handleOpenBuildFile = () => {
    onClickGotoProjectConfiguration(projects[activeProjectIndex].rootPath, projectType[activeProjectIndex]);
  };

  const handleApply = () => {
    onWillUpdateClassPaths(
      projects.map(p => p.rootPath),
      projectType,
      sources,
      defaultOutput,
      activeVmInstallPath,
      libraries
    );
  };

  const onDidChangeLoadingState = (event: OnDidChangeLoadingStateEvent) => {
    const {data} = event;
    if (data.command === "onDidChangeLoadingState") {
      dispatch(updateLoadingState(data.loading));
    }
  }

  useEffect(() => {
      window.addEventListener("message", onDidChangeLoadingState);
      return () => {
        window.removeEventListener("message", onDidChangeLoadingState);
      }
    }, []);

  useEffect(() => {
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
    }
  }, [projectType]);

  return (
    <div id="footer" className="setting-footer pb-2">
      <VSCodeDivider/>
        {(projectType[activeProjectIndex] === ProjectType.Gradle || projectType[activeProjectIndex] === ProjectType.Maven) &&
          <div className="mb-2 mt-1">
            <span className="setting-section-warning">
              '{projects[activeProjectIndex].name}' is imported by {projectType[activeProjectIndex]}, changes made to the classpath might be lost after reloading.
              To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
            </span>
          </div>
        }
        {loadingState && <VSCodeButton className="ml-1" disabled>Applying...</VSCodeButton>}
        {!loadingState && <VSCodeButton className="ml-1" appearance="primary" onClick={() => handleApply()}>Apply Settings</VSCodeButton>}
    </div>
  );
};

interface OnDidChangeLoadingStateEvent {
  data: {
    command: string;
    loading: boolean;
  };
}

export default Footer;
