// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";

export const JavaRuntimeEntryPanel = (props: JavaRuntimeEntry[]) => {
  const current = props.findIndex(entry => entry.isValid || false);
  const entries = props.map((entry, index) =>
    <tr>
      <th scope="row">{index + 1}</th>
      <td>
        {!entry.path && <em>*Empty*</em>}
        {entry.path}
        {index === current && <span className="badge badge-pill badge-primary">Current</span>}
        {entry.path && !entry.isValid && <span className="badge badge-pill badge-secondary" title={entry.hint}>Invalid</span>}
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
    <table className="table table-borderless table-hover table-sm">
      <thead>
        <tr>
          <th scope="col">Order</th>
          <th scope="col">Path</th>
          <th scope="col">Source</th>
          <th scope="col">Type</th>
        </tr>
      </thead>
      <tbody>
        {entries}
      </tbody>
    </table>
  );
};
