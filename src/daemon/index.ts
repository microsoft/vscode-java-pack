// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import * as vscode from "vscode";
import { sendError } from "vscode-extension-telemetry-wrapper";
import { LogWatcher } from "./logWatcher";

const execFile = promisify(cp.execFile);
const delay = promisify(setTimeout);

interface IJdtlsMetadata {
   pid?: string;
   jreHome?: string;
   workspace?: string;
}

let logWatcher: LogWatcher;
export async function initDaemon(context: vscode.ExtensionContext) {
   logWatcher = new LogWatcher(context);
   logWatcher.start();

   const jdtlsMetadata = await getJdtlsMetadata(context);
   console.log(jdtlsMetadata);
   if (jdtlsMetadata?.jreHome && jdtlsMetadata?.pid) {
      const uptime = await getUpTime(jdtlsMetadata?.jreHome!, jdtlsMetadata?.pid!);
      console.log("javaExt activated:", uptime);
      logWatcher.sendStartupMetadata();
   }
}

async function getJdtlsMetadata(context: vscode.ExtensionContext): Promise<IJdtlsMetadata | undefined> {
   const javaExt = vscode.extensions.getExtension("redhat.java");
   if (!javaExt) {
      return undefined;
   }

   // get embedded JRE Home
   let jreHome: string | undefined;
   try {
      const jreFolder = path.join(javaExt.extensionPath, "jre");
      const jreDistros = await fs.promises.readdir(jreFolder);
      if (jreDistros.length > 0) {
         jreHome = path.join(jreFolder, jreDistros[0]);
      }
   } catch (error) {
      console.error(error);
   }
   if (!jreHome) {
      return undefined;
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
      logWatcher.sendStartupMetadata();
      return undefined;
   }

   // on ServiceReady
   javaExt.exports.onDidServerModeChange(async (mode: string) => {
      console.log(mode);
      if (mode === "Standard") {
         const serviceReadyTime = await getUpTime(jreHome!, pid!);
         console.log("serviceReady:", serviceReadyTime)
         logWatcher.sendStartupMetadata();
      }
   });

   // get PID and jdtls.workspace
   const {pid, workspace} = await getPidAndWS(jreHome, context);


   return {
      jreHome,
      pid,
      workspace
   }

}

function parseJdtlsJps(jdtlsJpsLine: string): IJdtlsMetadata {
   const spaceIdx = jdtlsJpsLine.indexOf(" ");
   const pid = jdtlsJpsLine.slice(0, spaceIdx);
   const cmd = jdtlsJpsLine.slice(spaceIdx + 1);
   const res = cmd.match(/-XX:HeapDumpPath=(.*(redhat.java|vscodesws_[0-9a-f]{5}))/);
   let workspace;
   if (res && res[1]) {
      workspace = res[1];
   }

   return {
      pid,
      workspace
   };
}

async function getUpTime(jreHome: string, pid: string): Promise<string> {
   const execRes = await execFile(path.join(jreHome, "bin", "jcmd"), [pid, "VM.uptime"]);
   return execRes.stdout;
}

async function getPidAndWS(jreHome: string, context:vscode.ExtensionContext) {
   const jpsExecRes = await execFile(path.join(jreHome, "bin", "jps"), ["-v"]);
   const jdtlsLines = jpsExecRes.stdout.split(os.EOL).filter(line => line.includes("org.eclipse.jdt.ls.core"));
   let jdtlsJpsLine;
   if (context.storageUri) {
      jdtlsJpsLine = jdtlsLines.find(line => line.includes(path.dirname(context.storageUri!.fsPath)));
   } else {
      jdtlsJpsLine = jdtlsLines.find(line => line.includes("vscodesws_"));
   }

   return jdtlsJpsLine ? parseJdtlsJps(jdtlsJpsLine) : {};
}