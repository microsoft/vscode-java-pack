// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ExtensionContext } from "vscode";
import { LogWatcher } from "./logWatcher";

export function initDaemon(context: ExtensionContext) {
   new LogWatcher(context).start(); 
}