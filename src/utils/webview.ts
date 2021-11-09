// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * URL for webview commands. 
 * By executing the returned command, telemetry is sent before finally executing {command} {args}.
 * 
 * @param webview ID of the webview where the command runs
 * @param identifier will be record in telemetry
 * @param command command to execute
 * @param args must be an array, if provided
 * @returns 
 */
export function encodeCommandUriWithTelemetry(webview: string, identifier: string, command: string, args?: any[]) {
  const helperCommand = "java.webview.runCommand";
  const wrappedArgs = {
    webview,
    identifier,
    command,
    args
  };
  return `command:${helperCommand}?${encodeURIComponent(JSON.stringify(wrappedArgs))}`;
}

export function encodeExternalLinkWithTelemetry(webview: string, name: string, url: string) {
  return encodeCommandUriWithTelemetry(webview, name, "java.helper.openUrl", [url]);
}

/**
 * Check if navigator.platform matches os.
 * @param os "win", "linux", "mac"
 */
 export function supportedByNavigator(os: string): boolean {
  // Refer the implementation at https://github.com/microsoft/vscode/blob/413963c489fafa5163b5d6513731c7953de07fb3/src/vs/base/common/platform.ts#L86-L96
  const userAgent = navigator.userAgent;
  switch(os) {
    case "win":
      return userAgent.indexOf("Windows") >= 0;
    case "linux":
      return userAgent.indexOf("Linux") >= 0;
    case "mac":
      return userAgent.indexOf("Macintosh") >= 0;
  }

  return navigator.platform.toLowerCase().indexOf(os.toLowerCase()) === 0;
}


export enum ProjectType {
  Default = "Default project",
  UnmanagedFolder = "Unmanaged folder",
  Maven = "Maven",
  Gradle = "Gradle",
  Others = "Others",
}

export enum NatureId {
  Maven = "org.eclipse.m2e.core.maven2Nature",
  Gradle = "org.eclipse.buildship.core.gradleprojectnature",
  Java = "org.eclipse.jdt.core.javanature",
}
