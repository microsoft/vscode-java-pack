// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-textfield/index.js";

import { Dispatch } from "@reduxjs/toolkit";
import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectType } from "../../../../../utils/webview";
import { ClasspathRequest } from "../../../vscode/utils";
import { setOutputPath } from "../classpathConfigurationViewSlice";


const Output = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const output: string = useSelector((state: any) => state.classpathConfig.data.output[activeProjectIndex]);
  const projectType: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType[activeProjectIndex]);
  const dispatch: Dispatch<any> = useDispatch();
  const handleClick = () => {
    ClasspathRequest.onWillSelectOutputPath();
  };

  const onDidSelectOutputPath = (event: OnDidSelectOutputPathEvent) => {
    const { data } = event;
    if (data.command === "classpath.onDidSelectOutputPath") {
      dispatch(setOutputPath({
        activeProjectIndex: activeProjectIndexRef.current,
        outputPath: data.output
      }));
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
      <vscode-textfield className="inactive setting-section-text pl-1"
        readOnly
        value={output}
        placeholder="Output Path">
        <vscode-button slot="end" icon-only title="Browse..." aria-label="Browse..." onClick={() => handleClick()}>
          <span className="codicon codicon-folder-opened"></span>
        </vscode-button>
      </vscode-textfield>
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
