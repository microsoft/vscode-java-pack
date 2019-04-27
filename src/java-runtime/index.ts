// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as request from "request-promise-native";
import architecture = require("arch");

export async function validateJavaRuntime(): Promise<boolean> {
  const extension = vscode.extensions.getExtension("redhat.java");
  if (!extension) {
    return false;
  }
  try {
      const extensionApi = await extension.activate();
      // If the extension API loads, and requirement is set,
      // a JDK compatible with the Java Language extension is guaranteed.
      // No need to check the version
      if (extensionApi && extensionApi.javaRequirement) {
          return true;
      }
  } catch (ex) {
  }

  return false;
}

export async function suggestOpenJdk(jdkVersion: string = "openjdk11", impl: string = "hotspot") {
  let os: string = process.platform;
  if (os === "win32") {
    os = "windows";
  } else if (os === "darwin") {
    os = "mac";
  } else {
    os = "linux";
  }

  let arch = architecture();
  if (arch === "x86") {
    arch = "x32";
  }

  return await request.get({
    uri: `https://api.adoptopenjdk.net/v2/info/releases/${jdkVersion}?openjdk_impl=${impl}&arch=${arch}&os=${os}&type=jdk&release=latest`,
    json: true
  });
}
