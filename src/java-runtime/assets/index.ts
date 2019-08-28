// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";
import bytes = require("bytes");
import * as ReactDOM from "react-dom";
import { JavaRuntimeEntry, JdkData } from "../types";
import { JdkAcquisitionPanel, JdkAcquisitionPanelProps } from "./jdk.acquisition";
import * as React from "react";

window.addEventListener("message", event => {
  if (event.data.command === "applyJdkInfo") {
    applyJdkInfo(event.data.jdkInfo);
  } else if (event.data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(event.data.entries);
  }
});

let jdkEntries: JavaRuntimeEntry[];

function showJavaRuntimeEntries(entries: JavaRuntimeEntry[]) {
  jdkEntries = entries;
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
    size: bytes(binary.binary_size, {unitSeparator: " "}),
    downloadLink: encodedLink
  };

  render();
}

function render() {
  const props: JdkAcquisitionPanelProps = {
    jdkEntries: jdkEntries,
    jdkData: jdkData,
    onRequestJdk: requestJdkInfo
  };

  ReactDOM.render(React.createElement(JdkAcquisitionPanel, props), document.getElementById("jdkAcquisitionPanel"));
}

render();

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

function requestJdkInfo(jdkVersion: string, jvmImpl: string) {
  console.log(`request ${jdkVersion} ${jvmImpl}`);
  vscode.postMessage({
    command: "requestJdkInfo",
    jdkVersion: jdkVersion,
    jvmImpl: jvmImpl
  });
}
