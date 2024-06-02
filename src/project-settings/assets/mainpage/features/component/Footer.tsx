// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { ClasspathEntry, ProjectInfo } from "../../../../types";
import { useDispatch, useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { flushClasspathToEffective } from "../../../classpath/features/classpathConfigurationViewSlice";
import { ClasspathRequest, CompilerRequest, MavenRequest } from "../../../vscode/utils";
import _ from "lodash";
import { flushMavenSettingsToEffective } from "../../../maven/features/mavenConfigurationViewSlice";
import { flushCompilerSettingsToEffective } from "../../../compiler/features/compilerConfigurationViewSlice";
import { updateLoadingState } from "../commonSlice";

const Footer = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);

  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.sources[activeProjectIndex]);
  const effectiveSources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.effective.sources[activeProjectIndex]);
  const defaultOutput: string = useSelector((state: any) => state.classpathConfig.data.output[activeProjectIndex]);
  const effectiveOutput: string = useSelector((state: any) => state.classpathConfig.data.effective.output[activeProjectIndex]);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.data.activeVmInstallPath[activeProjectIndex]);
  const effectiveVmInstallPath: string = useSelector((state: any) => state.classpathConfig.data.effective.activeVmInstallPath[activeProjectIndex]);
  const libraries: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.libraries[activeProjectIndex]);
  const effectiveLibraries: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.effective.libraries[activeProjectIndex]);
  const classpathModified: boolean = !_.isEqual(sources, effectiveSources) ||
      defaultOutput !== effectiveOutput ||
      activeVmInstallPath !== effectiveVmInstallPath ||
      !_.isEqual(libraries, effectiveLibraries);

  const activeProfiles: string = useSelector((state: any) => state.mavenConfig.data.activeProfiles[activeProjectIndex]);
  const effectiveProfiles: string = useSelector((state: any) => state.mavenConfig.data.effective.activeProfiles[activeProjectIndex]);
  const mavenModified: boolean = activeProfiles !== effectiveProfiles;

  const useRelease: boolean = useSelector((state: any) => state.compilerConfig.data.useRelease[activeProjectIndex]);
  const effectiveUseRelease: boolean = useSelector((state: any) => state.compilerConfig.data.effective.useRelease[activeProjectIndex]);
  const enablePreview: boolean = useSelector((state: any) => state.compilerConfig.data.enablePreview[activeProjectIndex]);
  const effectiveEnablePreview: boolean = useSelector((state: any) => state.compilerConfig.data.effective.enablePreview[activeProjectIndex]);
  const complianceLevel: string = useSelector((state: any) => state.compilerConfig.data.complianceLevel[activeProjectIndex]);
  const effectiveComplianceLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.complianceLevel[activeProjectIndex]);
  const sourceLevel: string = useSelector((state: any) => state.compilerConfig.data.sourceLevel[activeProjectIndex]);
  const effectiveSourceLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.sourceLevel[activeProjectIndex]);
  const targetLevel: string = useSelector((state: any) => state.compilerConfig.data.targetLevel[activeProjectIndex]);
  const effectiveTargetLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.targetLevel[activeProjectIndex]);
  const generateDebugInfo: boolean = useSelector((state: any) => state.compilerConfig.data.generateDebugInfo[activeProjectIndex]);
  const effectiveGenerateDebugInfo: boolean = useSelector((state: any) => state.compilerConfig.data.effective.generateDebugInfo[activeProjectIndex]);
  const storeMethodParamNames: boolean = useSelector((state: any) => state.compilerConfig.data.storeMethodParamNames[activeProjectIndex]);
  const effectiveStoreMethodParamNames: boolean = useSelector((state: any) => state.compilerConfig.data.effective.storeMethodParamNames[activeProjectIndex]);
  const compilerModified: boolean = useRelease !== effectiveUseRelease ||
      enablePreview !== effectiveEnablePreview ||
      complianceLevel !== effectiveComplianceLevel ||
      sourceLevel !== effectiveSourceLevel ||
      targetLevel !== effectiveTargetLevel ||
      generateDebugInfo !== effectiveGenerateDebugInfo ||
      storeMethodParamNames !== effectiveStoreMethodParamNames;

  const loadingState: boolean = useSelector((state: any) => state.commonConfig.ui.loadingState);

  const dispatch: Dispatch<any> = useDispatch();

  const handleApply = () => {
    // classpath section
    if (classpathModified) {
      ClasspathRequest.onWillUpdateClassPaths(
        projects[activeProjectIndex].rootPath,
        projectType,
        sources,
        defaultOutput,
        activeVmInstallPath,
        libraries,
      );
    }

    // maven section
    if (mavenModified) {
      MavenRequest.onWillUpdateSelectProfiles(projects[activeProjectIndex].rootPath, activeProfiles);
    }

    // compiler section
    if (compilerModified) {
      CompilerRequest.onWillUpdateCompilerSettings(
        projects[activeProjectIndex].rootPath,
        useRelease,
        enablePreview,
        complianceLevel,
        sourceLevel,
        targetLevel,
        generateDebugInfo,
        storeMethodParamNames,
      );
    }

    // after update the settings, flush the effective settings.
    if (classpathModified) {
      dispatch(flushClasspathToEffective({
        activeProjectIndex,
      }));
    }
    if (mavenModified) {
      dispatch(flushMavenSettingsToEffective({
        activeProjectIndex
      }));
    }
    if (compilerModified) {
      dispatch(flushCompilerSettingsToEffective({
        activeProjectIndex,
      }));
    }
  };

  const onDidChangeLoadingState = (event: OnDidChangeLoadingStateEvent) => {
    const {data} = event;
    if (data.command === "main.onDidChangeLoadingState") {
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
    <div id="footer" className="pt-1">
        {loadingState && <VSCodeButton className="ml-1" disabled>Applying...</VSCodeButton>}
        {!loadingState &&
          <VSCodeButton
            className="ml-1"
            appearance="primary"
            disabled={!classpathModified && !mavenModified && !compilerModified}
            onClick={() => handleApply()}
          >
            Apply Settings
          </VSCodeButton>
        }
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
