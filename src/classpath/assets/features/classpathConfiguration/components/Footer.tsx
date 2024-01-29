// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeButton, VSCodeDivider, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import React from "react";
import { ClasspathEntry, ProjectInfo } from "../../../../types";
import { useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { onClickGotoProjectConfiguration, onWillChangeJdk, onWillSetOutputPath, onWillUpdateClassPaths, onWillUpdateSourcePathsForUnmanagedFolder, onWillUpdateUnmanagedFolderLibraries } from "../../../utils";

const Footer = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.classpathConfig.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.classpathConfig.projects);
  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.sources);
  const defaultOutput: string = useSelector((state: any) => state.classpathConfig.output);
  const activeVmInstallPath: string = useSelector((state: any) => state.classpathConfig.activeVmInstallPath);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  const libraries: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.libraries);

  let buildFile: string = "";
  if (projectType === ProjectType.Maven) {
    buildFile = "pom.xml";
  } else if (projectType === ProjectType.Gradle) {
    buildFile = "build.gradle";
  }

  const handleOpenBuildFile = () => {
    onClickGotoProjectConfiguration(projects[activeProjectIndex].rootPath, projectType);
  };

  const handleApply = () => {
    if (projectType === ProjectType.UnmanagedFolder) {
      onWillUpdateSourcePathsForUnmanagedFolder(sources.map(s => s.path));
      onWillSetOutputPath(defaultOutput);
      onWillUpdateUnmanagedFolderLibraries(libraries.map(l => l.path));
      onWillChangeJdk(activeVmInstallPath);
    } else {
      onWillUpdateClassPaths(sources, activeVmInstallPath, libraries);
    }
  };

  return (
    <div id="footer" className="setting-footer pb-2">
      <VSCodeDivider/>
        {(projectType === ProjectType.Gradle || projectType === ProjectType.Maven) &&
          <div className="mb-2 mt-1">
            <span className="setting-section-warning">
              '{projects[activeProjectIndex].name}' is imported by {projectType}, changes made to the classpath might be lost after reloading.
              To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
            </span>
          </div>
        }
        <VSCodeButton className="ml-1" appearance="primary" onClick={() => handleApply()}>Apply Settings</VSCodeButton>
    </div>
  );
};

export default Footer;
