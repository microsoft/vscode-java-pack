// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";
import { sourceLevelDisplayName, sourceLevelMajorVersion } from "../utils/misc";
import { updateRuntimePath } from "./vscode.api";

interface ManagedProjectRuntimePanelProps {
  entries: {
    sourceLevel: string;
    runtimePath: string;
  }[];
  jdks: JavaRuntimeEntry[];
}

export class ManagedProjectRuntimePanel extends React.Component<ManagedProjectRuntimePanelProps, {}> {

  render = () => {
    return (
      <div>
        <h3 className="font-weight-light">Maven/Gradle Projects</h3>
        <p>For projects managed by build tools, Java version is specified in build scripts. Here you can change the mapping between Java version and JDK used.</p>
        {this.props.entries.map(this.getRuntimeSelectorComponent)}
      </div>
    );
  }

  getRuntimeSelectorComponent = (entry:  {
    sourceLevel: string;
    runtimePath: string;
  }) => {
    const { sourceLevel, runtimePath } = entry;

    return (
      <div className="row" key={sourceLevel}>
        <div className="col">
          <div className="row sourcelevel">
            <div className="col">
              <div className="input-group mb-3">
                <div className="input-group-prepend">
                  <label className="input-group-text" htmlFor="invisible">{sourceLevelDisplayName(sourceLevel)}:</label>
                </div>
                <select className="form-control" name="jdk-for" id={sourceLevel} onChange={this.onSelectionChange} defaultValue={runtimePath}>
                  {/* TODO: sometimes runtimePath is undefined, e.g. LS use 11, project use 14 but without configuring java.configuarion.runtimes,
                  maybe an empty option should be provided. */}
                  {this.props.jdks.filter(jdk => jdk.majorVersion && jdk.majorVersion >= sourceLevelMajorVersion(sourceLevel)).map(jdk => (
                    <option key={jdk.name} value={jdk.fspath}>{jdk.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = event.target;
    updateRuntimePath(sourceLevelDisplayName(id), value);
  }

}
