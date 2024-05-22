// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import React, { Dispatch, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateActiveProfiles } from "../mavenConfigurationViewSlice";
import { MavenRequest } from "../../../vscode/utils";

const Profile = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: any[] = useSelector((state: any) => state.commonConfig.data.projects);
  const activeProfiles: string | undefined = useSelector((state: any) => state.mavenConfig.data.activeProfiles[activeProjectIndex]);

  const dispatch: Dispatch<any> = useDispatch();

  const onMessage = (event: any) => {
    const message = event.data;
    if (message.command === "maven.onDidGetSelectedProfiles") {
      dispatch(updateActiveProfiles({
        activeProjectIndex,
        activeProfiles: message.selectedProfiles
      }));
    }
  }

  useEffect(() => {
    window.addEventListener("message", onMessage);
    if (activeProfiles === undefined) {
      MavenRequest.onWillGetSelectedProfiles(projects[activeProjectIndex].rootPath);
    }
    return () => {
      window.removeEventListener("message", onMessage);
    }
  }, []);

  const handleInput = (e: any) => {
    dispatch(updateActiveProfiles({
      activeProjectIndex,
      activeProfiles: e.target.value,
    }));
  }

  return (
    <div className="setting-section">
      <div>
        <div className="setting-section-subtitle">
          <h4 className="mt-3 mb-1 mr-1">Active Maven Profiles</h4>
          <span>(comma separated)</span>
        </div>

        <VSCodeTextField className="setting-section-text"
          value={activeProfiles ?? ""}
          onInput={handleInput}>
        </VSCodeTextField>
      </div>
    </div>
  );
};

export default Profile;
