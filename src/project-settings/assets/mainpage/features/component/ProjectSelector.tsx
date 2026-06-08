// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-single-select/index.js";
import "@vscode-elements/elements/dist/vscode-option/index.js";

import { useCallback, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ProjectInfo } from "../../../../types";
import { Dispatch } from "@reduxjs/toolkit";

import { activeProjectChange } from "../../../mainpage/features/commonSlice";
import { ClasspathRequest, CompilerRequest, MavenRequest } from "../../../vscode/utils";

const ProjectSelector = (): JSX.Element | null => {
  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const projects: ProjectInfo[] = useSelector((state: any) => state.commonConfig.data.projects);

  const dispatch: Dispatch<any> = useDispatch();
  const selectRef = useRef<HTMLElement>(null);

  const handleActiveProjectChange = useCallback((index: number) => {
    dispatch(activeProjectChange(index));
  }, [dispatch]);

  // The vscode-single-select element renders its options in the shadow DOM and
  // only emits a native `change` event on the host element, so the click handlers
  // on the slotted vscode-option children never fire. Listen to `change` instead.
  useEffect(() => {
    const el = selectRef.current;
    if (!el) {
      return;
    }
    const onChange = (e: Event) => {
      const index = (e.target as any).selectedIndex;
      if (typeof index === "number" && index >= 0) {
        handleActiveProjectChange(index);
      }
    };
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, [handleActiveProjectChange]);

  // Keep the rendered selection in sync with the active project index.
  useEffect(() => {
    const el = selectRef.current;
    if (el && projects.length > 0) {
      (el as any).selectedIndex = activeProjectIndex;
    }
  }, [activeProjectIndex, projects]);

  useEffect(() => {
    if (projects.length === 0) {
      return;
    }

    ClasspathRequest.onWillLoadProjectClasspath(projects[activeProjectIndex].rootPath);
    CompilerRequest.onWillGetCompilerSettings(projects[activeProjectIndex].rootPath);
    MavenRequest.onWillGetSelectedProfiles(projects[activeProjectIndex].rootPath);
  }, [activeProjectIndex, projects]);

  const projectSelections = projects.map((project, index) => {
    if (projects.length === 0) {
      return null;
    }

    return (
      <vscode-option
        className="setting-section-option"
        key={project.rootPath}
        value={project.rootPath}
        selected={index === activeProjectIndex ? true : undefined}
      >
        {project.name}
      </vscode-option>
    );
  });

  return (
    <div id="project-selector" className="setting-section">
      <div className="flex-center mt-2 mb-2">
        <span className="setting-section-description ml-1 mr-1">Project:</span>
        <vscode-single-select ref={selectRef} className="setting-section-dropdown">
            {projectSelections}
        </vscode-single-select>
      </div>
    </div>
  );
};

export default ProjectSelector;
