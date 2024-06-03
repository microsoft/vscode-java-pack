// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import React, { Dispatch } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateActiveProfiles } from "../mavenConfigurationViewSlice";

const Profile = (): JSX.Element => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProfiles: string | undefined = useSelector((state: any) => state.mavenConfig.data.activeProfiles[activeProjectIndex]);

  const dispatch: Dispatch<any> = useDispatch();

  const handleInput = (e: any) => {
    dispatch(updateActiveProfiles({
      activeProjectIndex,
      activeProfiles: e.target.value,
    }));
  }

  return (
    <div className="setting-section">
      <div className="setting-section-subtitle">
        <h4 className="mt-3 mb-1 mr-1">Active Maven Profiles</h4>
        <span>(comma separated)</span>
      </div>

      <VSCodeTextField className="setting-section-text"
        value={activeProfiles ?? ""}
        onInput={handleInput}>
      </VSCodeTextField>
    </div>
  );
};

export default Profile;
