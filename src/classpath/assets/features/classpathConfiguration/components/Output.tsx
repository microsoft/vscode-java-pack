// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { onWillSelectOutputPath } from "../../../utils";
import { setOutputPath } from "../classpathConfigurationViewSlice";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

const Output = (): JSX.Element | null => {
    const output: string = useSelector((state: any) => state.classpathConfig.output[state.classpathConfig.activeProjectIndex]);
    const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType[state.classpathConfig.activeProjectIndex]);
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
        <VSCodeTextField className="inactive setting-section-text pl-1"
          readOnly
          value={output}
          placeholder="Output Path">
          <VSCodeButton slot="end" appearance="icon" title="Browse..." aria-label="Browse..." onClick={() => handleClick()}>
            <span className="codicon codicon-folder-opened"></span>
          </VSCodeButton>
        </VSCodeTextField>
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
