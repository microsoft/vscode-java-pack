// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { useSelector } from "react-redux";
import { ProjectType } from "../../../../utils/webview";
import Profile from "./components/Profile";

const MavenConfigurationView = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projectTypes: ProjectType = useSelector((state: any) => state.commonConfig.data.projectType);
  if (projectTypes.length === 0) {
    return null;
  }

  if (projectTypes[activeProjectIndex] !== ProjectType.Maven) {
    return <span>Not a Maven project</span>;
  } else  {
    return <Profile />;
  }
}

export default MavenConfigurationView;
