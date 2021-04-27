// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Icon } from "@iconify/react";
import closeIcon from "@iconify-icons/codicon/chrome-close";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ListGroup } from "react-bootstrap";
import { Dispatch } from "@reduxjs/toolkit";
import { updateSource } from "../classpathConfigurationViewSlice";
import { onWillAddSourcePath, onWillRemoveSourcePath } from "../../../utils";
import { ProjectType } from "../../../../../utils/webview";

const Sources = (): JSX.Element => {
  const sources: string[] = useSelector((state: any) => state.classpathConfig.sources);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (source: string) => {
    const updatedSources: string[] = [];
    for (const path of sources) {
      if (path === source) {
        continue;
      }
      updatedSources.push(path);
    }
    onWillRemoveSourcePath(updatedSources);
    dispatch(updateSource(updatedSources));
  };

  const handleAdd = () => {
    onWillAddSourcePath();
  };

  const onDidUpdateSourceFolder = (event: OnDidAddSourceFolderEvent) => {
    const {data} = event;
    if (data.command === "onDidUpdateSourceFolder") {
      dispatch(updateSource(data.sourcePaths));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidUpdateSourceFolder);
    return () => window.removeEventListener("message", onDidUpdateSourceFolder);
  }, []);

  let sourceSections: JSX.Element | JSX.Element[];
  if (sources.length === 0) {
    sourceSections = (
      <ListGroup.Item className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} list-row-body pl-0 py-0`}>
        <span className="ml-1"><em>No source paths are configured.</em></span>
      </ListGroup.Item>
    );
  } else {
    sourceSections = sources.map((source) => (
      <ListGroup.Item className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} list-row-body pl-0 py-0`} key={source}>
        <span className="ml-1">{source}</span>
        {projectType === ProjectType.UnmanagedFolder &&
          <span className="scale-up float-right">
            <a onClick={() => handleRemove(source)}>
              <Icon className="codicon cursor-pointer" icon={closeIcon} />
            </a>
          </span>
        }
      </ListGroup.Item>
    ));
  }

  return (
    <div>
      <div className="setting-section-header mb-1">
        <h4 className="mb-0">Sources</h4>
        {projectType !== ProjectType.UnmanagedFolder &&
          <span className="ml-2">(Read-only)</span>
        }
      </div>
      <span className="setting-section-description">Specify the source locations.</span>
      <ListGroup className="list mt-1">
        <ListGroup.Item className="list-row-header flex-vertical-center pr-2 pl-0 py-0">
          <span className="ml-1">Path</span>
        </ListGroup.Item>
        {sourceSections}
      </ListGroup>
      {projectType === ProjectType.UnmanagedFolder &&
        <a role="button" className="btn btn-action mt-2" onClick={() => handleAdd()}>Add</a>
      }
    </div>
  );
};

interface OnDidAddSourceFolderEvent {
  data: {
    command: string;
    sourcePaths: string[];
  };
}

export default Sources;
