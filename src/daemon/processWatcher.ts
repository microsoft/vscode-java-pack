// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "./daemon";
import { activatingTimestamp } from "../extension";
const execFile = promisify(cp.execFile);

interface IJdtlsMetadata {
   pid?: string;
   jreHome?: string;
   workspace?: string;
}


export class ProcessWatcher {
   private workspace?: string;
   private pid?: string;
   private jreHome?: string;
   private lastHeartbeat?: string;
   private context: vscode.ExtensionContext
   constructor(private daemon: LSDaemon) {
      this.context = daemon.context;
   }

   public async start(): Promise<boolean> {
      const javaExt = vscode.extensions.getExtension("redhat.java");
      if (!javaExt) {
         return false;
      }
      
      // First check java.jdt.ls.java.home setting
      let jreHome: string | undefined;
      let configJavaHome = vscode.workspace.getConfiguration().get<string>('java.jdt.ls.java.home');
      
      // If user has explicitly configured a Java home, use that
      if (configJavaHome) {
         if (await this.isValidJpsPath(configJavaHome)) {
            jreHome = configJavaHome;
         } else {
            // Log warning but continue with fallback
            console.warn(`Configured Java home ${configJavaHome} is not valid or not accessible. Checking other options.`);
         }
      }
      
      // If not found, check for default runtime in java.configuration.runtimes
      if (!jreHome) {
         const runtimes = vscode.workspace.getConfiguration().get<any[]>('java.configuration.runtimes');
         if (Array.isArray(runtimes) && runtimes.length > 0) {
            // First look for one marked as default
            const defaultRuntime = runtimes.find(r => r.default === true);
            if (defaultRuntime && defaultRuntime.path) {
               if (await this.isValidJpsPath(defaultRuntime.path)) {
                  jreHome = defaultRuntime.path;
               }
            } 
            
            // If no default is set or default is invalid, try the first one
            if (!jreHome && runtimes[0].path) {
               if (await this.isValidJpsPath(runtimes[0].path)) {
                  jreHome = runtimes[0].path;
               }
            }
         }
      }
      
      // If no valid JDK is found in settings, fall back to embedded JRE
      if (!jreHome) {
         try {
            const jreFolder = path.join(javaExt.extensionPath, "jre");
            const jreDistros = await fs.promises.readdir(jreFolder);
            if (jreDistros.length > 0) {
               jreHome = path.join(jreFolder, jreDistros[0]);
            }
         } catch (error) {
            // do nothing when jre is not embedded, to avoid spamming logs
         }
      }
      
      if (!jreHome) {
         return false;
      }
      this.jreHome = jreHome;

      const jdtlsmeta = await getPidAndWS(jreHome, this.context);
      this.pid = jdtlsmeta.pid;
      this.workspace = jdtlsmeta.workspace;

      return (this.pid !== undefined && this.workspace !== undefined);
   }

   public monitor() {
      const id = setInterval(() => {
         this.upTime().then(seconds => {
            if (!this.lastHeartbeat && seconds) {
               this.sendClientInitializeTime(seconds);
            }
            this.lastHeartbeat = seconds;
         }).catch(_e => {
            clearInterval(id);
            this.onDidJdtlsCrash(this.lastHeartbeat);
         });
      }, 5000);
      // TBD: e.g. constantly monitor heap size and uptime
   }

   public async upTime(): Promise<string | undefined> {
      if (!this.jreHome || !this.pid) {
         throw new Error("unsupported");
      }

      const execRes = await execFile(path.join(this.jreHome, "bin", "jcmd"), [this.pid, "VM.uptime"]);
      const r = /\d+\.\d+ s/;
      return execRes.stdout.match(r)?.toString();
   }

   public async heapSize(): Promise<string> {
      if (!this.jreHome || !this.pid) {
         throw new Error("unsupported");
      }

      const execRes = await execFile(path.join(this.jreHome, "bin", "jcmd"), [this.pid, "GC.heap_info"]);
      const ryoung = /PSYoungGen\s+total \d+K, used \d+K/;
      const y = execRes.stdout.match(ryoung)?.toString();

      const rold = /ParOldGen\s+total \d+K, used \d+K/;
      const o = execRes.stdout.match(rold)?.toString();
      return [y, o].join(os.EOL);
   }

   private async isValidJpsPath(jdkPath: string): Promise<boolean> {
      try {
         // Check if path exists
         await fs.promises.access(jdkPath, fs.constants.R_OK);
         
         // Check if the jps tool exists in the bin directory
         const jpsPath = path.join(jdkPath, "bin", "jps" + (os.platform() === 'win32' ? '.exe' : ''));
         await fs.promises.access(jpsPath, fs.constants.X_OK);
         
         return true;
      } catch (err) {
         return false;
      }
   }

   private onDidJdtlsCrash(lastHeartbeat?: string) {
      sendInfo("", {
         name: "jdtls-last-heartbeat",
         message1: lastHeartbeat!
      });
      this.daemon.logWatcher.sendErrorAndStackOnCrash();
   }

   /**
    * Send the time the client takes to initialize. This is the time between the
    * activation and the JVM process is launched.
    */
   private sendClientInitializeTime(seconds: string) {
      const upTime = seconds.match(/\d+\.\d+/)?.toString();
      if (upTime) {
         let interval = Math.round(
            performance.now() - activatingTimestamp - parseFloat(upTime) * 1000
         );
         sendInfo("", {
            name: "client-initialize-time",
            message1: interval.toString()
         });
      }
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
