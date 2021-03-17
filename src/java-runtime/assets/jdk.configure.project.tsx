import * as _ from "lodash";
import * as React from "react";
import { ProjectType } from "../../utils/webview";
import { JavaRuntimeEntry, ProjectRuntimeEntry } from "../types";
import { InvisibleProjectsRuntimePanel } from "./project.invisible";
import { ManagedProjectRuntimePanel } from "./project.managed";
import { openBuildScript } from "./vscode.api";

export const ProjectRuntimePanel = (props: {
  jdkEntries: JavaRuntimeEntry[];
  projectRuntimes: ProjectRuntimeEntry[];
}) => {
  const { jdkEntries, projectRuntimes } = props;

  const sourceLevelEntries = _.uniqBy(
    projectRuntimes
      .filter(p => p.projectType === ProjectType.Maven || p.projectType === ProjectType.Gradle)
      .map(p => ({ sourceLevel: p.sourceLevel, runtimePath: p.runtimePath })),
    "sourceLevel"
  );
  const unmanagedProject = projectRuntimes.find(p => p.projectType === ProjectType.UnmanagedFolder);
  const defaultJDK = unmanagedProject ? unmanagedProject.runtimePath : undefined;

  const sourceLevelRuntimePanels = !_.isEmpty(sourceLevelEntries) && <ManagedProjectRuntimePanel entries={sourceLevelEntries} jdks={jdkEntries} />;
  const invisibleProjectsRuntimePanel = unmanagedProject && defaultJDK && <InvisibleProjectsRuntimePanel jdks={jdkEntries} defaultJDK={unmanagedProject.runtimePath} />;

  const projectEntries = projectRuntimes
    .filter(p => p.projectType !== ProjectType.Default)
    .map((p, index) => (
      <tr key={index}>
        <td>{p.name}</td>
        <td>{p.sourceLevel}</td>
        {(p.projectType === ProjectType.Maven || p.projectType === ProjectType.Gradle) && <td><a href="#" onClick={() => onClickType(p)}>{p.projectType}</a></td>}
        {(p.projectType !== ProjectType.Maven && p.projectType !== ProjectType.Gradle) && <td>{p.projectType}</td>}
      </tr>
    ));
  const projectRuntimesTable = (
    <table className="table table-borderless table-hover table-sm mb-0">
      <caption>To use a different Java version for your projects, please specify it in build scripts.</caption>
      <thead>
        <tr>
          <th scope="col">Project</th>
          <th scope="col">Java Version</th>
          <th scope="col">Type</th>
        </tr>
      </thead>
      <tbody>
        {projectEntries}
      </tbody>
    </table>
  );

  return (
    <div className="col">
      <div className="row">
        <div className="col-6">
          <h3 className="font-weight-light">Workspace Overview</h3>
          {projectRuntimesTable}
          <details>
            <summary> Click to see how</summary>

            <p>For example, if you want to use Java 8, add below lines</p>
            <p>In <code>pom.xml</code> of a Maven project:</p>
            <blockquote>
              <code>
                <span>&lt;properties&gt;</span><br />
                <span>&nbsp;&nbsp;&lt;maven.compiler.source&gt;1.8&lt;/maven.compiler.source&gt;</span><br />
                <span>&nbsp;&nbsp;&lt;maven.compiler.target&gt;1.8&lt;/maven.compiler.target&gt;</span><br />
                <span>&lt;/properties&gt;</span>
              </code>
            </blockquote>

            <p>In <code>build.gradle</code> of a Gradle project:</p>
            <blockquote>
              <code>
                <span>sourceCompatibility = 1.8</span><br />
                <span>targetCompatibility = 1.8</span><br />
              </code>
            </blockquote>
          </details>
        </div>

        <div className="col-6">
          {/* Managed Projects */}
          {sourceLevelRuntimePanels}

          {/* invisible projects */}
          {invisibleProjectsRuntimePanel}
        </div>
      </div>
    </div>
  );
};

function onClickType(p: ProjectRuntimeEntry) {
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
