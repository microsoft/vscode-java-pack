// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import expandTilde = require("expand-tilde");
import * as pathExists from "path-exists";
import * as request from "request-promise-native";
import findJavaHome = require("find-java-home");
import architecture = require("arch");

const isWindows = process.platform.indexOf("win") === 0;
const JAVAC_FILENAME = path.join("bin", "javac" + (isWindows ? ".exe" : "")) ;
const JAVA_FILENAME = path.join("bin", "java" + (isWindows ? ".exe" : ""));

// Taken from https://github.com/Microsoft/vscode-java-debug/blob/7abda575111e9ce2221ad9420330e7764ccee729/src/launchCommand.ts

function parseMajorVersion(content: string): number {
  let regexp = /version "(.*)"/g;
  let match = regexp.exec(content);
  if (!match) {
      return 0;
  }
  let version = match[1];
  // Ignore '1.' prefix for legacy Java versions
  if (version.startsWith("1.")) {
      version = version.substring(2);
  }

  // look into the interesting bits now
  regexp = /\d+/g;
  match = regexp.exec(version);
  let javaVersion = 0;
  if (match) {
      javaVersion = parseInt(match[0], 10);
  }
  return javaVersion;
}

async function getJavaVersion(javaHome: string | undefined): Promise<number> {
  if (!javaHome) {
    return Promise.resolve(0);
  }

  return new Promise<number>((resolve, reject) => {
    cp.execFile(path.resolve(javaHome, JAVA_FILENAME),["-version"], {}, (err, stdout, stderr) => {
      resolve(parseMajorVersion(stderr));
    });
  });
}

async function findPossibleJdkInstallations(): Promise<{[location : string] : string | undefined}> {
  return new Promise<{[location : string] : string | undefined}>((resolve, reject) => {
    const javaHomeEntries: {[location : string] : string | undefined} = {
      "java.home": vscode.workspace.getConfiguration().get("java.home", undefined),
      "JDK_HOME": process.env["JDK_HOME"],
      "JAVA_HOME": process.env["JAVA_HOME"],
      "java.other": undefined
    };

    findJavaHome({allowJre: false}, (err, home) => {
      if (!err) {
        javaHomeEntries.other = home;
      }

      resolve(javaHomeEntries);
    });
  });
}

async function validateJdkInstallation(javaHome: string | undefined) {
  if (!javaHome) {
    return false;
  }

  javaHome = expandTilde(javaHome);
  return await pathExists(path.resolve(javaHome, JAVAC_FILENAME));
}

export async function validateJavaRuntime() {
  const jdkEntries = await findPossibleJdkInstallations();
  for (const key in jdkEntries) {
    if (jdkEntries.hasOwnProperty(key)) {
      const entry = jdkEntries[key];
      if (await validateJdkInstallation(entry) && await getJavaVersion(entry) >= 8) {
        return true;
      }
    }
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
