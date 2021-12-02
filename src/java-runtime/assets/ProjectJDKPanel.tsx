// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DataGridRowTypes, GenerateHeaderOptions } from "@microsoft/fast-foundation";
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import * as React from "react";
import { encodeCommandUriWithTelemetry, ProjectType } from "../../utils/webview";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../types";
import { DefaultJDKSelector } from "./components/DefaultJDKSelector";
import { ProjectTypeHint } from "./components/ProjectTypeHint";
import { onWillListRuntimes, openBuildScript } from "./vscode.api";

const { wrap } = provideReactWrapper(React);
const DataGrid = wrap(webviewUI.VSCodeDataGrid);
const DataRow = wrap(webviewUI.VSCodeDataGridRow);
const DataCell = wrap(webviewUI.VSCodeDataGridCell);
const Button = wrap(webviewUI.VSCodeButton);

interface Props {
  jdkEntries: JavaRuntimeEntry[];
  projectRuntimes: ProjectRuntimeEntry[];
};
interface State {
  showHintFor?: "Maven" | "Gradle" | "Others";
}

export class ProjectJDKPanel extends React.Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
    };
  }
  render = () => {
    const { jdkEntries, projectRuntimes } = this.props;
    const { showHintFor } = this.state;
    

    const projectTypeHint = (projectType: ProjectType) => {
      switch (projectType) {
        case "Maven":
          return <Button onClick={() => this.showHint("Maven")} appearance="icon" title="For projects managed by build tools, Java version is specified in build scripts(e.g. pom.xml)."><span className="codicon codicon-info"></span></Button>
        case "Gradle":
          return <Button onClick={() => this.showHint("Gradle")} appearance="icon" title="For projects managed by build tools, Java version is specified in build scripts(e.g. build.gradle)."><span className="codicon codicon-info"></span></Button>
        default:
          return <Button onClick={() => this.showHint("Others")} appearance="icon" title="For folders containing .java files, but not managed by build tools like Maven/Gradle, a default JDK is used."><span className="codicon codicon-info"></span></Button>
      }
    }

    const projectEntries = projectRuntimes
      .filter(p => p.projectType !== ProjectType.Default)
      .map((p, index) => (
        <DataRow key={index}>
          <DataCell gridColumn="1">{p.name}</DataCell>
          <DataCell gridColumn="2"><div className="inline-flex">{p.projectType}{projectTypeHint(p.projectType)}</div></DataCell>
          <DataCell gridColumn="3">
            {
              hasBuildTool(p) ?
                <div className="inline-flex">
                  <span>{p.sourceLevel}</span>
                  <Button appearance="icon" onClick={() => this.onClickEdit(p)} title="Edit"><span className="codicon codicon-edit"></span></Button>
                </div>
                :
                <DefaultJDKSelector projectRuntime={p} jdkEntries={jdkEntries} />
            }
          </DataCell>
        </DataRow>
      ));
    const downloadJDKCommand = encodeCommandUriWithTelemetry("java.runtime", "download", "java.installJdk");
    return (
      <div className="container">
        <h1>Configure Runtime for Projects</h1>
        {projectEntries.length > 0 && <p>Manage Java runtime for your projects. If you don't have a valid Java runtime, you can <a href={downloadJDKCommand}>download</a> one.</p>}
        {
          projectEntries.length > 0 ?
            <DataGrid generateHeader={GenerateHeaderOptions.none} gridTemplateColumns="1fr 1fr 1fr">
              <DataRow rowType={DataGridRowTypes.stickyHeader}>
                <DataCell gridColumn="1">Project Name</DataCell>
                <DataCell gridColumn="2">Type</DataCell>
                <DataCell gridColumn="3">Java Version</DataCell>
              </DataRow>
              {projectEntries}
            </DataGrid>
            :
            <div>
              <p>No project detected yet. Please refresh later if Java extension is importing your projects.</p>
              <Button onClick={this.refresh}>Refresh<span slot="start" className="codicon codicon-refresh"></span></Button>
            </div>
        }
        <ProjectTypeHint projectType={showHintFor} />
      </div>
    );
  }

  onClickEdit = (p: ProjectRuntimeEntry) => {
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

  showHint = (projectType: any) => {
    this.setState({
      showHintFor: projectType
    });
  }

  refresh = () => {
    onWillListRuntimes();
  }
  
}

function hasBuildTool(p: ProjectRuntimeEntry) {
  return (p.projectType === ProjectType.Maven || p.projectType === ProjectType.Gradle);
}