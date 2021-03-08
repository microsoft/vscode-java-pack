// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * URL for webview commands. 
 * By executing the retured command, telemetry is sent before finally executing {command} {args}.
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
