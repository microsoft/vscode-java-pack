// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export function encodeCommandUri(command: string, args?: string[]) {
  let ret = `command:${command}`;
  if (args && args.length > 0) {
    ret += `?${encodeURIComponent(JSON.stringify(args))}`;
  }
  return ret;
}
