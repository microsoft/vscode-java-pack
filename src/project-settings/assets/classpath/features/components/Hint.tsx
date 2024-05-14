// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeLink} from "@vscode/webview-ui-toolkit/react";
import React, { useEffect } from "react";
import { ProjectInfo } from "../../../../handlers/classpath/types";
import { useSelector } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { updateMaxHeight } from "../../utils";
import { ClasspathRequest } from "../../../vscode/utils";

const Hint = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);
  const projectType: ProjectType[] = useSelector((state: any) => state.commonConfig.data.projectType);

  let buildFile: string = "";
  if (projectType[activeProjectIndex] === ProjectType.Maven) {
    buildFile = "pom.xml";
  } else if (projectType[activeProjectIndex] === ProjectType.Gradle) {
    buildFile = "build.gradle";
  }

  const handleOpenBuildFile = () => {
    ClasspathRequest.onClickGotoProjectConfiguration(projects[activeProjectIndex].rootPath, projectType[activeProjectIndex]);
  };

  useEffect(() => {
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
    }
  }, [projectType]);

  return (
    <div id="hint" className="setting-footer pb-2">
        {(projectType[activeProjectIndex] === ProjectType.Gradle || projectType[activeProjectIndex] === ProjectType.Maven) &&
          <div className="mt-1">
            <span className="setting-section-warning">
              '{projects[activeProjectIndex].name}' is imported by {projectType[activeProjectIndex]}, changes made to the classpath might be lost after reloading.
              To make permanent changes, please edit the <VSCodeLink href="" onClick={() => handleOpenBuildFile()}>{buildFile}</VSCodeLink> file.
            </span>
          </div>
        }
    </div>
  );
};

export default Hint;
