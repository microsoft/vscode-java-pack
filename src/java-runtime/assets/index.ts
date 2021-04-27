// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "bootstrap/js/src/tab";
const $ = require("jquery");
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JdkConfigurationPanel } from "./jdk.configure";
import { JdkInstallationPanel } from "./jdk.installation";
import { onWillListRuntimes, requestJdkInfo } from "./vscode.api";
import bytes = require("bytes");
import "./style.scss";

const onInitialize = (event: any) => {
  const { data } = event;
  if (data.command === "applyJdkInfo") {
    applyJdkInfo(data.jdkInfo);
  } else if (data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(data.args);
  }
};

window.addEventListener("message", onInitialize);
renderLoadingPage();
onWillListRuntimes();

/**
 * Listing runtime can be slow, show loading page immediately after opening webview
 */
function renderLoadingPage() {
  ReactDOM.render(React.createElement(JdkConfigurationPanel), document.getElementById("jdkConfigurationPanel"));
  ReactDOM.render(React.createElement(JdkInstallationPanel), document.getElementById("jdkInstallationPanel"));
}

function showJavaRuntimeEntries(args: any) {
  const props = {
    jdkEntries: args.javaRuntimes,
    projectRuntimes: args.projectRuntimes,
    javaHomeError: args.javaHomeError,
    javaDotHome: args.javaDotHome
  };
  ReactDOM.render(React.createElement(JdkConfigurationPanel, props), document.getElementById("jdkConfigurationPanel"));
  registerTabSwitchEvents();
}

function applyJdkInfo(jdkInfo: any) {
  let binary = jdkInfo.binaries[0];
  let downloadLink = binary.installer_link || binary.binary_link;
  let encodedLink = `command:java.helper.openUrl?${encodeURIComponent(JSON.stringify(downloadLink))}`;

  const jdkData = {
    name: jdkInfo.release_name,
    os: binary.os,
    arch: binary.architecture,
    size: bytes(binary.binary_size, { unitSeparator: " " }),
    downloadLink: encodedLink
  };

  const props = {
    jdkData,
    onRequestJdk: requestJdkInfo
  };

  ReactDOM.render(React.createElement(JdkInstallationPanel, props), document.getElementById("jdkInstallationPanel"));
}

/**
 * To remove after we retire jQuery from this page/
 */
function registerTabSwitchEvents() {
  $("a.navigation").click((e: any) => {
    ($($(e.target).attr("href") || "") as any).tab("show");
  });
}
