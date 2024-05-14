// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClasspathConfigurationView from "../../classpath/features/ClasspathConfigurationView";
import { updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import "../style.scss";
import { updateActiveSection } from "./commonSlice";
import ProjectSelector from "./component/ProjectSelector";
import { VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import Footer from "./component/Footer";
import SideBar from "./component/SideBar";

const ProjectSettingView = (): JSX.Element => {
  const activeSection: string = useSelector((state: any) => state.commonConfig.ui.activeSection);
  const dispatch: Dispatch<any> = useDispatch();

  React.useEffect(() => {
    window.addEventListener("message", onWillChangeRoute);
    return () => {
      window.removeEventListener("message", onWillChangeRoute);
    };
  }, []);

  const getSectionContent = () => {
    if (activeSection === "classpath") {
      return <ClasspathConfigurationView />;
    }

    return null;
  }

  const onWillChangeRoute = (e: any) => {
    const { data } = e;
    if (data.command === "main.onWillChangeRoute") {
      const routes = data.route.split("/");
      dispatch(updateActiveSection(routes[0]));
      if (routes.length > 1) {
        switch (routes[0]) {
          case "classpath":
            // TODO: sometimes when directly trigger 'Configure Java Runtime', the tab won't
            // focus to the JDK part, need to investigate
            dispatch(updateActiveTab(routes[1]));
            break;
          default:
            break;
        }
      }
    }
  }

  return (
    <div className="root">
      <ProjectSelector />
      <VSCodeDivider />
      <div className="app-container">
        <SideBar />
        <div className="app-frame">
          {getSectionContent()}
        </div>
      </div>
      <VSCodeDivider />
      <Footer />
    </div>

  );
};

export default ProjectSettingView;
