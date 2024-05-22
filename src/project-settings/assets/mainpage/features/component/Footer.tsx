// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { ClasspathEntry, ProjectInfo } from "../../../../types";
import { useDispatch, useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { updateLoadingState } from "../../../classpath/features/classpathConfigurationViewSlice";
import { ClasspathRequest, CompilerRequest, MavenRequest } from "../../../vscode/utils";

const Footer = (): JSX.Element => {

  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const sources: ClasspathEntry[][] = useSelector((state: any) => state.classpathConfig.data.sources);
  const defaultOutput: string[] = useSelector((state: any) => state.classpathConfig.data.output);
  const activeVmInstallPath: string[] = useSelector((state: any) => state.classpathConfig.data.activeVmInstallPath);
  const projectType: ProjectType[] = useSelector((state: any) => state.commonConfig.data.projectType);
  const libraries: ClasspathEntry[][] = useSelector((state: any) => state.classpathConfig.data.libraries);
  const activeProfiles: string[] = useSelector((state: any) => state.mavenConfig.data.activeProfiles);
  const useRelease: boolean[] = useSelector((state: any) => state.compilerConfig.data.useRelease);
  const enablePreview: boolean[] = useSelector((state: any) => state.compilerConfig.data.enablePreview);
  const complianceLevel: string[] = useSelector((state: any) => state.compilerConfig.data.complianceLevel);
  const sourceLevel: string[] = useSelector((state: any) => state.compilerConfig.data.sourceLevel);
  const targetLevel: string[] = useSelector((state: any) => state.compilerConfig.data.targetLevel);
  const generateDebugInfo: boolean[] = useSelector((state: any) => state.compilerConfig.data.generateDebugInfo);
  const storeMethodParamNames: boolean[] = useSelector((state: any) => state.compilerConfig.data.storeMethodParamNames);
  const loadingState: boolean = useSelector((state: any) => state.classpathConfig.loadingState);

  const dispatch: Dispatch<any> = useDispatch();

  const handleApply = () => {
    ClasspathRequest.onWillUpdateClassPaths(
      projects.map(p => p.rootPath),
      projectType,
      sources,
      defaultOutput,
      activeVmInstallPath,
      libraries
    );

    // maven section
    for (let i = 0; i < projects.length; i++) {
      if (projectType[i] === ProjectType.Maven) {
        MavenRequest.onWillUpdateSelectProfiles(projects[i].rootPath, activeProfiles[i]);
      }
    }

    // compiler section
    for (let i = 0; i < projects.length; i++) {
      CompilerRequest.onWillUpdateCompilerSettings(
        projects[i].rootPath,
        useRelease[i],
        enablePreview[i],
        complianceLevel[i],
        sourceLevel[i],
        targetLevel[i],
        generateDebugInfo[i],
        storeMethodParamNames[i]
      );
    }
  };

  const onDidChangeLoadingState = (event: OnDidChangeLoadingStateEvent) => {
    const {data} = event;
    if (data.command === "classpath.onDidChangeLoadingState") {
      dispatch(updateLoadingState(data.loading));
    }
  }

  useEffect(() => {
      window.addEventListener("message", onDidChangeLoadingState);
      return () => {
        window.removeEventListener("message", onDidChangeLoadingState);
      }
    }, []);

  return (
    <div id="footer" className="pt-1 pb-2">
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
