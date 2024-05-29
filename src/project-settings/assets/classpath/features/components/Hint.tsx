// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeLink} from "@vscode/webview-ui-toolkit/react";
import React, { useEffect } from "react";
import { ClasspathEntry, ProjectInfo } from "../../../../types";
import { useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { updateMaxHeight } from "../../utils";
import { ClasspathRequest } from "../../../vscode/utils";
import _ from "lodash";

const Hint = (): JSX.Element | null => {

  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectType: ProjectType[] = useSelector((state: any) => state.commonConfig.data.projectType);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
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

  useEffect(() => {
    updateMaxHeight();
  }, [projectType, classpathModified]);

  useEffect(() => {
    window.addEventListener('resize', updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
    }
  }, []);

  if (!classpathModified) {
    return null;
  }

  let buildFile: string = "";
  if (projectType[activeProjectIndex] === ProjectType.Maven) {
    buildFile = "pom.xml";
  } else if (projectType[activeProjectIndex] === ProjectType.Gradle) {
    buildFile = "build.gradle";
  }

  const handleOpenBuildFile = () => {
    ClasspathRequest.onClickGotoProjectConfiguration(projects[activeProjectIndex].rootPath, projectType[activeProjectIndex]);
  };

  return (
    <div id="hint" className="setting-footer pb-2">
        {(projectType[activeProjectIndex] === ProjectType.Gradle || projectType[activeProjectIndex] === ProjectType.Maven) &&
          <span className="setting-section-warning">
            '{projects[activeProjectIndex].name}' is imported by {projectType[activeProjectIndex]}, changes made to the classpath might be lost after reloading.
            To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
          </span>
        }
    </div>
  );
};

export default Hint;
