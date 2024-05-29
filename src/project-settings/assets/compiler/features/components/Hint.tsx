// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeLink} from "@vscode/webview-ui-toolkit/react";
import React from "react";
import { useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { ClasspathRequest } from "../../../vscode/utils";
import { ProjectInfo } from "../../../../types";
import _ from "lodash";

const Hint = (): JSX.Element | null => {

  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectType: ProjectType[] = useSelector((state: any) => state.commonConfig.data.projectType);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const complianceLevel: string = useSelector((state: any) => state.compilerConfig.data.complianceLevel[activeProjectIndex]);
  const effectiveComplianceLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.complianceLevel[activeProjectIndex]);
  const sourceLevel: string = useSelector((state: any) => state.compilerConfig.data.sourceLevel[activeProjectIndex]);
  const effectiveSourceLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.sourceLevel[activeProjectIndex]);
  const targetLevel: string = useSelector((state: any) => state.compilerConfig.data.targetLevel[activeProjectIndex]);
  const effectiveTargetLevel: string = useSelector((state: any) => state.compilerConfig.data.effective.targetLevel[activeProjectIndex]);
  const compilerModified: boolean = complianceLevel !== effectiveComplianceLevel ||
      sourceLevel !== effectiveSourceLevel ||
      targetLevel !== effectiveTargetLevel;

  if (!compilerModified) {
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
          <div className="mt-1">
            <span className="setting-section-warning">
              '{projects[activeProjectIndex].name}' is imported by {projectType[activeProjectIndex]}, some changes made to the compiler settings might be lost after reloading.
              To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
            </span>
          </div>
        }
    </div>
  );
};

export default Hint;
