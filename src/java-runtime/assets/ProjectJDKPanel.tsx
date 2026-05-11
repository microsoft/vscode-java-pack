// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-header/index.js";
import "@vscode-elements/elements/dist/vscode-table-header-cell/index.js";

import { useState } from "react";
import { encodeCommandUriWithTelemetry, ProjectType } from "../../utils/webview";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../types";
import { DefaultJDKSelector } from "./components/DefaultJDKSelector";
import { ProjectTypeHint } from "./components/ProjectTypeHint";
import { onWillListRuntimes, openBuildScript } from "./vscode.api";

interface Props {
  jdkEntries: JavaRuntimeEntry[];
  projectRuntimes: ProjectRuntimeEntry[];
}

export function ProjectJDKPanel({ jdkEntries, projectRuntimes }: Props) {
  const [showHintFor, setShowHintFor] = useState<"Maven" | "Gradle" | "Others" | undefined>();

  const projectTypeHint = (projectType: ProjectType) => {
    switch (projectType) {
      case "Maven":
        return <vscode-button onClick={() => setShowHintFor("Maven")} icon-only title="For projects managed by build tools, Java version is specified in build scripts(e.g. pom.xml)."><span className="codicon codicon-info"></span></vscode-button>;
      case "Gradle":
        return <vscode-button onClick={() => setShowHintFor("Gradle")} icon-only title="For projects managed by build tools, Java version is specified in build scripts(e.g. build.gradle)."><span className="codicon codicon-info"></span></vscode-button>;
      default:
        return <vscode-button onClick={() => setShowHintFor("Others")} icon-only title="For folders containing .java files, but not managed by build tools like Maven/Gradle, a default JDK is used."><span className="codicon codicon-info"></span></vscode-button>;
    }
  };

  const onClickEdit = (p: ProjectRuntimeEntry) => {
    let scriptFile;
    if (p.projectType === ProjectType.Maven) {
      scriptFile = "pom.xml";
    } else if (p.projectType === ProjectType.Gradle) {
      scriptFile = "build.gradle";
    }
    if (scriptFile) {
      openBuildScript(p.rootPath, scriptFile);
    }
  };

  const projectEntries = projectRuntimes
    .filter(p => p.projectType !== ProjectType.Default)
    .map((p, index) => (
      <vscode-table-row key={index}>
        <vscode-table-cell>{p.name}</vscode-table-cell>
        <vscode-table-cell><div className="inline-flex">{p.projectType}{projectTypeHint(p.projectType)}</div></vscode-table-cell>
        <vscode-table-cell>
          {
            hasBuildTool(p) ?
              <div className="inline-flex">
                <span>{p.sourceLevel}</span>
                <vscode-button icon-only onClick={() => onClickEdit(p)} title="Edit"><span className="codicon codicon-edit"></span></vscode-button>
              </div>
              :
              <DefaultJDKSelector projectRuntime={p} jdkEntries={jdkEntries} />
          }
        </vscode-table-cell>
      </vscode-table-row>
    ));

  const downloadJDKCommand = encodeCommandUriWithTelemetry("java.runtime", "download", "java.installJdk");

  return (
    <div className="container">
      <h1>Configure Runtime for Projects</h1>
      {projectEntries.length > 0 && <p>Manage Java runtime for your projects. If you don't have a valid Java runtime, you can <a href={downloadJDKCommand}>download</a> one.</p>}
      {
        projectEntries.length > 0 ?
          <vscode-table>
            <vscode-table-header slot="header">
              <vscode-table-header-cell>Project Name</vscode-table-header-cell>
              <vscode-table-header-cell>Type</vscode-table-header-cell>
              <vscode-table-header-cell>Java Version</vscode-table-header-cell>
            </vscode-table-header>
            <vscode-table-body slot="body">
              {projectEntries}
            </vscode-table-body>
          </vscode-table>
          :
          <div>
            <p>No project detected yet. Please refresh later if Java extension is importing your projects.</p>
            <vscode-button onClick={onWillListRuntimes}>Refresh<span slot="start" className="codicon codicon-refresh"></span></vscode-button>
          </div>
      }
      <ProjectTypeHint projectType={showHintFor} />
    </div>
  );
}

function hasBuildTool(p: ProjectRuntimeEntry) {
  return (p.projectType === ProjectType.Maven || p.projectType === ProjectType.Gradle);
}
