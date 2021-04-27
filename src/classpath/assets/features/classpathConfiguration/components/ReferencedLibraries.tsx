// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ListGroup } from "react-bootstrap";
import { Icon } from "@iconify/react";
import closeIcon from "@iconify-icons/codicon/chrome-close";
import { removeReferencedLibrary, addReferencedLibraries } from "../classpathConfigurationViewSlice";
import { onWillAddReferencedLibraries, onWillRemoveReferencedLibraries } from "../../../utils";
import { ProjectType } from "../../../../../utils/webview";

const ReferencedLibraries = (): JSX.Element => {
  const referencedLibraries: string[] = useSelector((state: any) => state.classpathConfig.referencedLibraries);
  const projectType: ProjectType = useSelector((state: any) => state.classpathConfig.projectType);
  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (index: number) => {
    onWillRemoveReferencedLibraries(referencedLibraries[index]);
    dispatch(removeReferencedLibrary(index));
  };

  const handleAdd = () => {
    onWillAddReferencedLibraries();
  };

  const onDidAddReferencedLibraries = (event: OnDidAddReferencedLibrariesEvent) => {
    const {data} = event;
      if (data.command === "onDidAddReferencedLibraries") {
        dispatch(addReferencedLibraries(data.jars));
      }
  };

  useEffect(() => {
    window.addEventListener("message", onDidAddReferencedLibraries);
    return () => window.removeEventListener("message", onDidAddReferencedLibraries);
  }, []);

  let referencedLibrariesSections: JSX.Element | JSX.Element[];
  if (referencedLibraries.length === 0) {
    referencedLibrariesSections = (
      <ListGroup.Item className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} list-row-body pl-0 py-0`}>
        <span className="ml-1"><em>No referenced libraries are configured.</em></span>
      </ListGroup.Item>
    );
  } else {
    referencedLibrariesSections = referencedLibraries.map((library, index) => (
      <ListGroup.Item className={`${projectType !== ProjectType.UnmanagedFolder ? "inactive" : ""} list-row-body flex-vertical-center pl-0 py-0`} key={library}>
        <span className="ml-1">{library}</span>
        {projectType === ProjectType.UnmanagedFolder &&
          <span className="scale-up float-right">
            <a onClick={() => handleRemove(index)}>
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
        <h4 className="mb-0">Referenced Libraries</h4>
        {projectType !== ProjectType.UnmanagedFolder &&
          <span className="ml-2">(Read-only)</span>
        }
      </div>
      <span className="setting-section-description">Specify referenced libraries of the project.</span>
      <ListGroup className="list mt-1">
      <ListGroup.Item className="list-row-header pr-2 pl-0 py-0">
        <span className="ml-1">Path</span>
      </ListGroup.Item>
        {referencedLibrariesSections}
      </ListGroup>
      {projectType === ProjectType.UnmanagedFolder &&
        <a role="button" className="btn btn-action mt-2" onClick={() => handleAdd()}>Add</a>
      }
    </div>
  );
};

interface OnDidAddReferencedLibrariesEvent {
  data: {
    command: string;
    jars: string[];
  };
}

export default ReferencedLibraries;
