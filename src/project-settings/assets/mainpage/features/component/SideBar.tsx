// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateActiveSection } from "../commonSlice";
import { CommonRequest } from "../../../vscode/utils";

const CLASSPATH = "classpath";
const FORMATTER = "formatter";

const SideBar = (): JSX.Element => {

  const activeSection: string = useSelector((state: any) => state.commonConfig.ui.activeSection);
  const dispatch: Dispatch<any> = useDispatch();

  const onClickNavBarItem = (panelId: string) => {
    if (panelId === FORMATTER) {
      CommonRequest.onWillExecuteCommand("java.formatterSettings");
      return;
    }
    dispatch(updateActiveSection(panelId));
  };

  return (
    <div className="app-sidebar">
      <div className="app-sidebar-content">
        <div className="mt-2">
          <div className={`section-link ${activeSection === CLASSPATH ? "section-link-active" : ""} mb-1`} onClick={() => onClickNavBarItem(CLASSPATH)}>
            Classpath
          </div>
          <div className="section-link mb-1" onClick={() => onClickNavBarItem(FORMATTER)}>
            Formatter <span className="codicon codicon-link-external"></span>
          </div>
        </div>
      </div>
      <div className="app-sidebar-resizer" />
    </div>
  );
};

export default SideBar;
