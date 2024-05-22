// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateActiveSection } from "../commonSlice";
import { CommonRequest } from "../../../vscode/utils";
import { ProjectType } from "../../../../../utils/webview";
import { SectionId } from "../../../../types";

const SideBar = (): JSX.Element => {

  const activeSection: string = useSelector((state: any) => state.commonConfig.ui.activeSection);
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);

  const dispatch: Dispatch<any> = useDispatch();

  const onClickNavBarItem = (panelId: string) => {
    if (panelId === SectionId.Formatter) {
      CommonRequest.onWillExecuteCommand("java.formatterSettings");
      return;
    }
    dispatch(updateActiveSection(panelId));
  };

  return (
    <div className="app-sidebar">
      <div className="app-sidebar-content">
        <div className="mt-2">
          <div className={`section-link ${activeSection === SectionId.Classpath ? "section-link-active" : ""} mb-1`} onClick={() => onClickNavBarItem(SectionId.Classpath)}>
            Classpath
          </div>
          {
            projectType === ProjectType.Maven && (
              <div className={`section-link ${activeSection === SectionId.Maven ? "section-link-active" : ""} mb-1`} onClick={() => onClickNavBarItem(SectionId.Maven)}>
                Maven
              </div>
            )
          }
          <div className="section-link mb-1" onClick={() => onClickNavBarItem(SectionId.Formatter)}>
            Formatter <span className="codicon codicon-link-external"></span>
          </div>
        </div>
      </div>
      <div className="app-sidebar-resizer" />
    </div>
  );
};

export default SideBar;
