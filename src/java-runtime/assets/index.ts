// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import $ = require("jquery");
import "../../assets/vscode.scss";
import "bootstrap/js/src/tab";
import bytes = require("bytes");
import { JavaRuntimeEntryPanel } from "./java.runtime.entries";
import * as ReactDOM from "react-dom";
import { JavaRuntimeEntry } from "../types";

window.addEventListener("message", event => {
  if (event.data.command === "applyJdkInfo") {
    applyJdkInfo(event.data.jdkInfo);
  } else if (event.data.command === "showJavaRuntimeEntries") {
    showJavaRuntimeEntries(event.data.entries);
  }
});

function showJavaRuntimeEntries(entries: JavaRuntimeEntry[]) {
  ReactDOM.render(JavaRuntimeEntryPanel(entries), document.getElementById("javaRuntimeEntryPanel"));
}

function applyJdkInfo(jdkInfo: any) {
  let binary = jdkInfo.binaries[0];
  let downloadLink = binary.installer_link || binary.binary_link;
  $("#jdkOs").text(binary.os);
  $("#jdkArch").text(binary.architecture);
  $("#jdkReleaseName").text(jdkInfo.release_name);
  $("#jdkDownloadSize").text(bytes(binary.binary_size, {unitSeparator: " "}));

  let encodedLink = `command:java.helper.openUrl?${encodeURIComponent(JSON.stringify(downloadLink))}`;
  $("#jdkDownloadLink").attr("href", encodedLink);

  $("#jdkSpinner").addClass("d-none");
  $("#jdkDownloadLink").removeClass("d-none");
}

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

function requestJdkInfo(jdkVersion: string, jvmImpl: string) {
  vscode.postMessage({
    command: "requestJdkInfo",
    jdkVersion: jdkVersion,
    jvmImpl: jvmImpl
  });
}

$("input[type=radio]").change(() => {
  $("#jdkSpinner").removeClass("d-none");
  $("#jdkDownloadLink").addClass("d-none");
  requestJdkInfo($("input[name=jdkVersion]:checked").val() + "", $("input[name=jvmImpl]:checked").val() + "");
});
