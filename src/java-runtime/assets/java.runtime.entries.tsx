// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";

export const JavaRuntimeEntryPanel = (props: JavaRuntimeEntry[]) => {
  const currentIndex = props.findIndex(entry => !!entry.path);
  let errorIndex = -1;
  if (currentIndex !== -1 && !props[currentIndex].isValid) {
    errorIndex = currentIndex;
  }

  const entries = props.map((entry, index) =>
    <tr key={index}>
      <th scope="row">{index + 1}</th>
      <td>
        {!entry.path && <em>{"<Empty>"}</em>}
        {entry.path}
        &nbsp;
        {index === currentIndex && <span className="badge badge-pill badge-primary">Current</span>}
        {entry.path && !entry.isValid && <span className="badge badge-pill badge-secondary" title={entry.hint}>Invalid</span>}
        {entry.path && entry.hint && <div><em className={errorIndex === index ? "text-danger" : "text-warning"}>{entry.hint}</em></div>}
      </td>
      <td>
        {entry.name}
      </td>
      <td>
        {!entry.actionUri && entry.type}
        {entry.actionUri && <a href={entry.actionUri}>{entry.type}</a>}
      </td>
    </tr>
  );

  return (
    <div className="table-responsive">
      <table className="table table-borderless table-hover table-sm mb-0">
        <caption className="pb-0">If you change any of the entries above, you need to <a href="command:workbench.action.reloadWindow">reload</a> VS Code to make them effective.</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Path</th>
            <th scope="col">Source</th>
            <th scope="col">Type</th>
          </tr>
        </thead>
        <tbody>
          {entries}
        </tbody>
      </table>
    </div>
  );
};
