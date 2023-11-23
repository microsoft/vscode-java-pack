// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { onWillSelectOutputPath } from "../../../utils";
import { setOutputPath } from "../classpathConfigurationViewSlice";
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import SectionHeader from "./common/SectionHeader";

const Output = (): JSX.Element => {
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

    return (
      <div className="setting-section">
        <SectionHeader title="Output" subTitle={projectType !== ProjectType.UnmanagedFolder ? "(Read-only)" : undefined} />
        <span className="setting-section-description">Specify compile output path location.</span>
        <div className="setting-section-target">
          <VSCodeTextArea
            className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} setting-section-text`}
            readOnly
            value={output}
            resize="both"
            rows={1}
          />
        </div>
        {projectType === ProjectType.UnmanagedFolder &&
          <VSCodeButton onClick={() => handleClick()}>Browse</VSCodeButton>
        }
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
