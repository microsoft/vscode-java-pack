// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";

export function sourceLevelDisplayName(ver: string | number) {
  if (!ver) {
    return "";
  }

  if (ver === "1.5" || ver === 5) {
    return "J2SE-1.5";
  }

  if (typeof ver === "number") {
    return ver <= 8 ? `JavaSE-1.${ver}` : `JavaSE-${ver}`;
  } else {
    return `JavaSE-${ver}`;
  }
}

export function sourceLevelMajorVersion(level: string): number {
  if (!level) {
    return 0;
  }

  let version = level.replace(/^.*-/, ""); // remove "JaveSE-"
  // Ignore "1." prefix for legacy Java versions
  if (version.startsWith("1.")) {
    version = version.substring(2);
  }

  // look into the interesting bits now
  const regexp = /\d+/g;
  const match = regexp.exec(version);
  let javaVersion = 0;
  if (match) {
    javaVersion = parseInt(match[0], 10);
  }
  return javaVersion;
}

export function isSamePath(a: string, b: string): boolean {
  return !!(a && b) && path.relative(a, b) === "";
}


export function getMajorVersion(version: string) {
  if (!version) {
    return 0;
  }
  // Ignore "1." prefix for legacy Java versions
  if (version.startsWith("1.")) {
    version = version.substring(2);
  }

  // look into the interesting bits now
  const regexp = /\d+/g;
  const match = regexp.exec(version);
  let javaVersion = 0;
  if (match) {
    javaVersion = parseInt(match[0], 10);
  }
  return javaVersion;
}
