// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as React from "react";
import { JavaRuntimeEntry } from "../types";

export interface InstalledJDKPanelProps {
  jdkEntries?: JavaRuntimeEntry[];
}

export const InstalledJDKPanel = (props: InstalledJDKPanelProps) => {
  return (
    <div className="col">
      <div className="row mb-3">
        <div className="col">
          <h3 className="font-weight-light">Detected JDKs</h3>
          <p>
            JDKs installed on this machine are listed below:
          </p>
          <div className="card">
            <div className="card-body">
              <JDKTablePanel jdkEntries={props.jdkEntries} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const JDKTablePanel = (props: InstalledJDKPanelProps) => {
  const isLoading = _.isEmpty(props && props.jdkEntries);

  if (isLoading) {
    return (<div className="spinner-border spinner-border-sm" role="status">
      <span className="sr-only">Loading...</span>
    </div>);
  }

  const entryData = (props && props.jdkEntries) || [];
  const entries = entryData.map((entry, index) => {
    return (
      <tr key={index}>
        <th scope="row">{index + 1}</th>
        <td>
          {entry.fspath}
        </td>
        <td>
          {entry.majorVersion}
        </td>
      </tr>
    );
  });

  return (
    <div className="table-responsive">
      <table className="table table-borderless table-hover table-sm mb-0">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Path</th>
            <th scope="col">Version</th>
          </tr>
        </thead>
        <tbody>
          {entries}
        </tbody>
      </table>
    </div>
  );
};
