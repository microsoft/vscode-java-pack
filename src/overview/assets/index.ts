// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import $ = require("jquery");
import "./index.scss";
import "bootstrap/js/src/tab";
import bytes = require("bytes");

window.addEventListener("message", event => {
  if (event.data.command === "hideInstalledExtensions") {
    hideInstalledExtensions(event.data.installedExtensions);
    hideEmptySections();
  } else if (event.data.command === "setOverviewVisibility") {
    $("#showWhenUsingJava").prop("checked", event.data.visibility);
  } else if (event.data.command === "showJavaRuntimePanel") {
    $("#javaRuntimePanel").removeClass("d-none");
  } else if (event.data.command === "applyJdkInfo") {
    applyJdkInfo(event.data.jdkInfo);
  }
});

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

function hideInstalledExtensions(extensions: any) {
  $("div[ext]").each((index, elem) => {
    const anchor = $(elem);
    const ext = (anchor.attr("ext") || "").toLowerCase();
    if (extensions.indexOf(ext) !== -1) {
      anchor.hide();
    }
  });
}

function hideEmptySections() {
  $("div h3").parent().each((i, div) => {
    if (!$(div).children("h3 ~ div").is(":visible")) {
      $(div).hide();
    }
  });
}

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

$("#showWhenUsingJava").change(function () {
  vscode.postMessage({
    command: "setOverviewVisibility",
    visibility: $(this).is(":checked")
  });
});

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
