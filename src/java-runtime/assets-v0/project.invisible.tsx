// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";
import { setDefaultRuntime } from "./vscode.api";

interface InvisibleProjectsRuntimePanelProps {
  jdks: JavaRuntimeEntry[];
  defaultJDK?: string;
}

export class InvisibleProjectsRuntimePanel extends React.Component<InvisibleProjectsRuntimePanelProps, {}> {
  render = () => {
    const { jdks, defaultJDK } = this.props;
    return (
      <div>
        <h3 className="font-weight-light">Unmanaged Folders</h3>
        <p>For folders containing .java files, but <strong>NOT</strong> managed by build tools like Maven/Gradle, a default JDK is used.</p>
        <div className="row">
          <div className="col">
            <div className="row sourcelevel">
              <div className="col">
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <label className="input-group-text" htmlFor="invisible">Default JDK:</label>
                  </div>
                  <select className="form-control" id="invisible" defaultValue={defaultJDK} onChange={this.onSelectionChange}>
                    {defaultJDK === undefined && <option key="placeholder" hidden disabled selected>-- Select --</option>}
                    {jdks.map(jdk => (
                      <option key={jdk.name} value={jdk.fspath} >{jdk.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    const targetJdk = this.props.jdks.find(jdk => jdk.fspath === value);
    if (targetJdk) {
      setDefaultRuntime(targetJdk.fspath, targetJdk.majorVersion);
    }
  }
}
