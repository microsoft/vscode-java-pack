// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export function getExtensionName() {
  const packageInfo = getPackageInfo();
  return `${packageInfo["publisher"]}.${packageInfo["name"]}`;
}

export function getExtensionVersion() {
  return getPackageInfo()["version"];
}

function getPackageInfo() {
  return {} = require("../../package.json");
}
