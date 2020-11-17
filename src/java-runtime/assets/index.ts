// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "bootstrap/js/src/tab";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JavaRuntimeEntry, JdkData, ProjectRuntimeEntry } from "../types";
import { JdkConfigurationPanel } from "./jdk.configure";
import { JdkInstallationPanel } from "./jdk.installation";
import { requestJdkInfo } from "./vscode.api";
import bytes = require("bytes");

window.addEventListener("message", event => {
  if (event.data.command === "applyJdkInfo") {
    applyJdkInfo(event.data.jdkInfo);
  } else if (event.data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(event.data.args);
  }
});

let jdkEntries: JavaRuntimeEntry[] | undefined;
let projectRuntimes: ProjectRuntimeEntry[] | undefined;
let javaHomeError: any;
let javaDotHome: string | undefined;
function showJavaRuntimeEntries(args: {
  javaRuntimes?: JavaRuntimeEntry[];
  projectRuntimes?: ProjectRuntimeEntry[];
  javaHomeError?: string;
  javaDotHome?: string;
}) {
  jdkEntries = args.javaRuntimes;
  projectRuntimes = args.projectRuntimes;
  javaHomeError = args.javaHomeError;
  javaDotHome = args.javaDotHome;
  render();
}

let jdkData: JdkData;

function applyJdkInfo(jdkInfo: any) {
  let binary = jdkInfo.binaries[0];
  let downloadLink = binary.installer_link || binary.binary_link;
  let encodedLink = `command:java.helper.openUrl?${encodeURIComponent(JSON.stringify(downloadLink))}`;

  jdkData = {
    name: jdkInfo.release_name,
    os: binary.os,
    arch: binary.architecture,
    size: bytes(binary.binary_size, { unitSeparator: " " }),
    downloadLink: encodedLink
  };

  render();
}

function render() {
  const props = {
    jdkEntries: jdkEntries,
    projectRuntimes: projectRuntimes,
    jdkData: jdkData,
    onRequestJdk: requestJdkInfo,
    javaHomeError,
    javaDotHome
  };

  ReactDOM.render(React.createElement(JdkConfigurationPanel, props), document.getElementById("jdkConfigurationPanel"));
  ReactDOM.render(React.createElement(JdkInstallationPanel, props), document.getElementById("jdkInstallationPanel"));

  $("a.navigation").click(e => {
    ($($(e.target).attr("href") || "") as any).tab("show");
  });

}

render();

