// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

interface Props {
  projectType: "Maven" | "Gradle" | "Others" | undefined;
}

export class ProjectTypeHint extends React.Component<Props, {}> {

  render = () => {
    return (
      <div className="hintPanel">
        {this.hintContent()}
      </div>
    );
  }

  hintContent = () => {
    const { projectType } = this.props;
    switch (projectType) {
      case "Maven":
        return (
          <div>
            <p>For projects managed by build tools, Java version is specified in build scripts. E.g. to use Java 8, add below lines in <code>pom.xml</code>:</p>
            <div>
              <code>
                <span>&lt;properties&gt;</span><br />
                <span>&nbsp;&nbsp;&lt;maven.compiler.source&gt;1.8&lt;/maven.compiler.source&gt;</span><br />
                <span>&nbsp;&nbsp;&lt;maven.compiler.target&gt;1.8&lt;/maven.compiler.target&gt;</span><br />
                <span>&lt;/properties&gt;</span>
              </code>
            </div>
          </div>
        );
      case "Gradle":
        return (
          <div>
            <p>For projects managed by build tools, Java version is specified in build scripts. E.g. to use Java 8, add below lines in <code>build.gradle</code>:</p>
            <div>
              <code>
                <span>sourceCompatibility = 1.8</span><br />
                <span>targetCompatibility = 1.8</span><br />
              </code>
            </div>
          </div>
        );

      case "Others":
        return (
          <div>
            <p>For folders containing .java files, but not managed by build tools like Maven/Gradle, a default JDK is used.</p>
          </div>
        );
      default:
        return undefined;
    }
  }
}