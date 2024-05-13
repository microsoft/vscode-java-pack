// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Dispatch } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClasspathConfigurationView from "../../classpath/features/ClasspathConfigurationView";
import { updateActiveTab } from "../../classpath/features/classpathConfigurationViewSlice";
import "../style.scss";
import { updateActiveSection } from "./commonSlice";

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
            // TODO: sometimes when directly trigger 'COnfigure Java Runtime', the tab won't
            // focus to the JDK part, need to investigate
            dispatch(updateActiveTab(routes[1]));
            break;
          default:
            break;
        }
      }
    }
  }

  const onClickNavBarItem = (panelId: string) => {
    dispatch(updateActiveSection(panelId));
  };

  return (
    <div className="app-container">
        <div className="app-sidebar">
          <div className="app-sidebar-content">
            <div className="mt-2">
              <div className={`section-link ${activeSection === "classpath" ? "section-link-active" : ""}`} onClick={() => onClickNavBarItem("classpath")}>
                Classpath
              </div>
            </div>
          </div>
          <div className="app-sidebar-resizer" />
        </div>
        <div className="app-frame">
          {getSectionContent()}
        </div>
      </div>
  );
};

export default ProjectSettingView;
