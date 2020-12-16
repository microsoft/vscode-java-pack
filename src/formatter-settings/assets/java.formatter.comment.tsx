// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as React from "react";
import { JavaFormatterSetting } from ".";

export interface CommentSettingsProps {
  commentSettings?: JavaFormatterSetting[];
}

export const CommentSettingsPanel = (props: CommentSettingsProps) => {
  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <h3 className="font-weight-light">WhiteSpace</h3>
          <p></p>
          <JavaCommentSettingsPanel commentSettings={props.commentSettings} />
        </div>
        <div className="col-6">
          <h3 className="font-weight-light">Preview</h3>
        </div>
      </div>
    </div>
  );
};

const JavaCommentSettingsPanel = (props: CommentSettingsProps) => {
  const isLoading = _.isEmpty(props && props.commentSettings);
  if (isLoading) {
    return (<div className="spinner-border spinner-border-sm" role="status">
      <span className="sr-only">props.whitespaceSettings</span>
    </div>);
  }
  const entryData = (props && props.commentSettings) || [];
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
