// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataGridRowTypes, GenerateHeaderOptions } from "@microsoft/fast-foundation";
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import * as React from "react";
import { encodeCommandUriWithTelemetry, ProjectType } from "../../utils/webview";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../types";
import { openBuildScript, setDefaultRuntime } from "./vscode.api";

const { wrap } = provideReactWrapper(React);
const DataGrid = wrap(webviewUI.VSCodeDataGrid);
const DataRow = wrap(webviewUI.VSCodeDataGridRow);
const DataCell = wrap(webviewUI.VSCodeDataGridCell);
const Button = wrap(webviewUI.VSCodeButton);

interface ProjectJDKPanelProps {
  jdkEntries: JavaRuntimeEntry[];
  projectRuntimes: ProjectRuntimeEntry[];
};
interface ProjectJDKPanelState {
}

export class ProjectJDKPanel extends React.Component<ProjectJDKPanelProps, ProjectJDKPanelState> {
  render = () => {
    const { jdkEntries, projectRuntimes } = this.props;

    const projectTypeHint = (projectType: ProjectType) => {
      switch (projectType) {
        case "Maven":
          return <Button appearance="icon" title="For projects managed by build tools, Java version is specified in build scripts(e.g. pom.xml)."><span className="codicon codicon-info"></span></Button>
        case "Gradle":
          return <Button appearance="icon" title="For projects managed by build tools, Java version is specified in build scripts(e.g. build.gradle)."><span className="codicon codicon-info"></span></Button>
        default:
          return <Button appearance="icon" title="For folders containing .java files, but not managed by build tools like Maven/Gradle, a default JDK is used."><span className="codicon codicon-info"></span></Button>
      }
    }

    const projectEntries = projectRuntimes
      .filter(p => p.projectType !== ProjectType.Default)
      .map((p, index) => (
        <DataRow key={index}>
          <DataCell gridColumn="1">{p.name}</DataCell>
          <DataCell gridColumn="2">{p.projectType}{projectTypeHint(p.projectType)}</DataCell>
          <DataCell gridColumn="3">
            {hasBuildTool(p) && <span>{p.sourceLevel}</span>}
            {
              hasBuildTool(p) ?
                <Button appearance="icon" onClick={() => this.onClickType(p)}><span className="codicon codicon-edit"></span></Button>
                :
                this.createJdkDropdown(p, jdkEntries)

            }
          </DataCell>
        </DataRow>
      ));
    const downloadJDKCommand = encodeCommandUriWithTelemetry("java.runtime", "download from adoptium", "java.helper.openUrl", ["https://adoptium.net"]);
    return (
      <div className="container">
        <h1>Configure Java Project Runtime</h1>
        <p>Manage Java runtime for your projects. If you don't have a valid Java runtime, you can <a href={downloadJDKCommand}>download</a> one.</p>
        <DataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 1fr 1fr">
          <DataRow rowType={DataGridRowTypes.stickyHeader}>
            <DataCell gridColumn="1">Project Name</DataCell>
            <DataCell gridColumn="2">Type</DataCell>
            <DataCell gridColumn="3">Java Version</DataCell>
          </DataRow>
          {projectEntries}
        </DataGrid>
      </div>
    );
  }

  createJdkDropdown = (p: ProjectRuntimeEntry, jdkEntries: JavaRuntimeEntry[]) => {

    return (
      <select className="jdkDropdown" id="jdkDropdown" defaultValue={p.runtimePath} onChange={this.onSelectionChange}>
        {jdkEntries.map(jdk => (
          <option key={jdk.name} value={jdk.fspath}>{jdk.majorVersion} - {jdk.name}</option>
        ))}
      </select>
    );
  }

  onSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    const targetJdk = this.props.jdkEntries.find(jdk => jdk.fspath === value);
    if (targetJdk) {
      setDefaultRuntime(targetJdk.fspath, targetJdk.majorVersion);
    }
  }

  onClickType = (p: ProjectRuntimeEntry) => {
    if (!hasBuildTool(p)) {
      // unmanaged folder
      this.setState({ configuringProject: p.rootPath });
    } else {
      let scriptFile;
      if (p.projectType === ProjectType.Maven) {
        scriptFile = "pom.xml";
      } else if (p.projectType === ProjectType.Gradle) {
        scriptFile = "build.gradle";
      }

      if (scriptFile) {
        openBuildScript(p.rootPath, scriptFile);
      }
    }
  }
}

function hasBuildTool(p: ProjectRuntimeEntry) {
  return (p.projectType === ProjectType.Maven || p.projectType === ProjectType.Gradle);
}