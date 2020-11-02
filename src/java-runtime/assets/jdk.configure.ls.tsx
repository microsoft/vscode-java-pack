// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { JavaRuntimeEntry } from "../types";
import { udpateJavaHome } from "./vscode.api";

export interface ConfigureLSPanelProps {
  jdkEntries?: JavaRuntimeEntry[];
  javaDotHome?: string;
  javaHomeError?: any;
}

interface ConfigureLSPanelStates {
  isDirty: boolean;
}

export class ConfigureLSPanel extends React.Component<ConfigureLSPanelProps, ConfigureLSPanelStates> {
  constructor(props: ConfigureLSPanelProps) {
    super(props);
    this.state = {
      isDirty: false
    };
  }

  render = () => {
    const { jdkEntries, javaHomeError, javaDotHome } = this.props;
    if (!jdkEntries) {
      return (
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    const jdks = jdkEntries.map(e => ({
      name: e.fspath,
      fspath: e.fspath,
      majorVersion: e.majorVersion,
      version: e.majorVersion,
    }));

    return (
      <div className="col">
        <h3 className="font-weight-light">Java Language Server</h3>
        <p> Language Server requires JDK 11+ to launch itself. If you change the entry below, you need to <a href="command:workbench.action.reloadWindow">reload</a> VS Code to make it effective. </p>
        <div className="row sourcelevel">
          <div className="col">
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <label className="input-group-text" htmlFor="ls">JDK for Language Server:</label>
              </div>
              <select className="form-control" id="ls" onChange={this.onSelectionChange} defaultValue={javaDotHome}>
                {javaHomeError && <option key="placeholder" hidden disabled selected>-- Select --</option>}
                {jdks.filter(jdk => jdk.majorVersion !== undefined && jdk.majorVersion >= 11).map(jdk => (
                  <option key={jdk.fspath} value={jdk.fspath}>{jdk.fspath}</option>
                ))}
              </select>
              {this.state.isDirty && (<div><a className="btn btn-primary" href="command:workbench.action.reloadWindow" role="button" title="Reload Visual Studio Code">Reload Window</a></div>)}
            </div>
            {javaHomeError !== undefined && (<div className="text-danger">{javaHomeError}</div>)}
          </div>
        </div>
        <p>
          Note: to run your projects with a different Java version, you can configure <a className="navigation" href="#configure-runtime-tab">Project JDKs</a>.
      </p>
      </div>
    );
  }

  onSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    udpateJavaHome(value);
    this.setState({ isDirty: true });
  }

}

