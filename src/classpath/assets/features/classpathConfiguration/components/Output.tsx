// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { onWillSelectOutputPath } from "../../../utils";
import { setOutputPath } from "../classpathConfigurationViewSlice";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";

const Output = (): JSX.Element | null => {
    const output: string = useSelector((state: any) => state.classpathConfig.output);
    const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
    const dispatch: Dispatch<any> = useDispatch();
    const handleClick = () => {
      onWillSelectOutputPath();
    };

    const onDidSelectOutputPath = (event: OnDidSelectOutputPathEvent) => {
      const {data} = event;
      if (data.command === "onDidSelectOutputPath") {
        dispatch(setOutputPath(data.output));
      }
    };

    useEffect(() => {
      window.addEventListener("message", onDidSelectOutputPath);
      return () => window.removeEventListener("message", onDidSelectOutputPath);
    }, []);

    if (projectType !== ProjectType.UnmanagedFolder) {
      return null;
    }

    return (
      <div className="setting-section mt-2">
        <h4 className="mb-2 pl-1">Output Path</h4>
        <div className="pt-1 pb-1">
          <VSCodeButton className="pl-1 pr-1 pt-1 pb-1 mb-1" slot="end" appearance="icon" onClick={() => handleClick()}>
            <span className="codicon codicon-folder-opened mr-1"></span>
            Browse
          </VSCodeButton>
        </div>
        <VSCodeTextArea
          className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-text pl-1`}
          readOnly
          value={output}
          resize="both"
          rows={1}
        />
      </div>
    );
};

interface OnDidSelectOutputPathEvent {
  data: {
    command: string
    output: string
  };
}

export default Output;
