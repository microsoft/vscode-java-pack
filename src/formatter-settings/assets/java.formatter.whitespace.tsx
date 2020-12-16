// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as React from "react";
import { JavaFormatterSetting } from ".";

export interface WhitespaceSettingsProps {
  whitespaceSettings?: JavaFormatterSetting[];
}

export const WhitespaceSettingsPanel = (props: WhitespaceSettingsProps) => {
  const test = "private static final double PI = 3.14;\nggg";
  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <h3 className="font-weight-light">WhiteSpace</h3>
          <p></p>
          <JavaWhitespaceSettingsPanel whitespaceSettings={props.whitespaceSettings} />
        </div>
        <div className="col-6">
          <h3 className="font-weight-light">Preview</h3>
          <div className="md-form">
            <textarea id="form7" className="md-textarea form-control" rows={15}>{test}</textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

const JavaWhitespaceSettingsPanel = (props: WhitespaceSettingsProps) => {
  const isLoading = _.isEmpty(props && props.whitespaceSettings);
  if (isLoading) {
    return (<div className="spinner-border spinner-border-sm" role="status">
      <span className="sr-only">props.whitespaceSettings</span>
    </div>);
  }
  const entryData = (props && props.whitespaceSettings) || [];
  const entries = entryData.map((entry, index) => {
    return (
      <tr key={index}>
        <th scope="row">{index + 1}</th>
        <td>
          {entry.name}
        </td>
        <td>
          {entry.value}
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
