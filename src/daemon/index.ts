// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { promisify } from "util";
import * as vscode from "vscode";
import { sendError } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "./daemon";

const delay = promisify(setTimeout);

let daemon: LSDaemon;
export async function initDaemon(context: vscode.ExtensionContext) {
   daemon = new LSDaemon(context);
   await daemon.initialize()

   const activated = await checkJavaExtActivated(context);
   if (activated) {
      daemon.logWatcher.sendStartupMetadata("redhat.java activated");
   }
}

async function checkJavaExtActivated(_context: vscode.ExtensionContext): Promise<boolean> {
   const javaExt = vscode.extensions.getExtension("redhat.java");
   if (!javaExt) {
      return false;
   }

   // wait javaExt to activate
   const timeout = 30 * 60 * 1000; // wait 30 min at most
   let count = 0;
   while(!javaExt.isActive && count < timeout) {
      await delay(1000);
      count += 1000;
   }

   if (!javaExt.isActive) {
      sendError(new Error("redhat.java extension not activated within 30 min"));
      daemon.logWatcher.sendStartupMetadata("redhat.java activation timeout");
      return false;
   }

   // on ServiceReady
   javaExt.exports.onDidServerModeChange(async (mode: string) => {
      if (mode === "Standard") {
         daemon.logWatcher.sendStartupMetadata("jdtls standard server ready");

         // watchdog
         if (await daemon.processWatcher.start()) {
            daemon.processWatcher.monitor();
         } else {
            sendError(new Error("jdtls watchdog is not started"));
         }
      }
   });

   return true;
}
