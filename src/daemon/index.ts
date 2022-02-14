// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { promisify } from "util";
import * as vscode from "vscode";
import { sendError } from "vscode-extension-telemetry-wrapper";
import { LogWatcher } from "./logWatcher";
import { ProcessWatcher } from "./processWatcher";

const delay = promisify(setTimeout);

let logWatcher: LogWatcher;
let jdtlsWatcher: ProcessWatcher;
export async function initDaemon(context: vscode.ExtensionContext) {
   registerTestCommands(context);
   jdtlsWatcher = new ProcessWatcher(context);


   logWatcher = new LogWatcher(context);
   logWatcher.start();

   const activated = await checkJavaExtActivated(context);
   if (activated) {
      logWatcher.sendStartupMetadata("redhat.java activated");
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
      console.log("waiting");
      count += 1000;
   }

   if (!javaExt.isActive) {
      sendError(new Error("redhat.java extension not activated within 30 min"));
      logWatcher.sendStartupMetadata("redhat.java activation timeout");
      return false;
   }

   // on ServiceReady
   javaExt.exports.onDidServerModeChange(async (mode: string) => {
      console.log(mode);
      if (mode === "Standard") {
         logWatcher.sendStartupMetadata("jdtls standard server ready");


         if (await jdtlsWatcher.start()) {
            jdtlsWatcher.monitor();
         } else {
            console.log("jdtls Watcher not started.");
         }
      }
   });

   return true;
}

function registerTestCommands(context: vscode.ExtensionContext) {
   context.subscriptions.push(vscode.commands.registerCommand("java.testDaemon", async () => {
      const cmd = await vscode.window.showInputBox({
         placeHolder: "delegate command name",
         value: "java.maven.searchArtifact"
      });
      vscode.commands.executeCommand("java.execute.workspaceCommand", cmd);
   }))
}

