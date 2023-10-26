// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { promisify } from "util";
import * as vscode from "vscode";
import { sendError, sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "./daemon";
import { getExpService } from "../exp";
import { TreatmentVariables } from "../exp/TreatmentVariables";
import { workspace } from "vscode";
import * as hdr from "hdr-histogram-js";

const delay = promisify(setTimeout);

let daemon: LSDaemon;
export async function initDaemon(context: vscode.ExtensionContext) {
   daemon = new LSDaemon(context);
   await daemon.initialize();

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

   vscode.workspace.onDidGrantWorkspaceTrust(() => {
      checkIfJavaServerCrashed(30 * 1000 /*ms*/);
   });

   // wait javaExt to activate
   const timeout = 30 * 60 * 1000; // wait 30 min at most
   let count = 0;
   while(!javaExt.isActive && count < timeout) {
      await delay(1000);
      count += 1000;
      if (count % 10000 === 0) {
         checkIfJavaServerCrashed();
      }
   }

   if (!javaExt.isActive) {
      sendError(new Error("redhat.java extension not activated within 30 min"));
      daemon.logWatcher.sendStartupMetadata("redhat.java activation timeout");
      return false;
   }

   traceSessionStatus(javaExt);
   traceJavaExtension(javaExt);
   traceLSPPerformance(javaExt);

   // on ServiceReady
   javaExt.exports.onDidServerModeChange(async (mode: string) => {
      if (mode === "Hybrid") { // begin to start standard language server
         checkIfJavaServerCrashed(30 * 1000 /*ms*/);
      }

      if (mode === "Standard") {
         daemon.logWatcher.sendStartupMetadata("jdtls standard server ready");

         daemon.logWatcher.stop(); // Only focus on errors occurred during startup.

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

const INTERESTED_REQUESTS: Set<string> = new Set([
   "initialize",
   "textDocument/completion",
]);
const CANCELLATION_CODE: number = -32800; // report such error if the request is cancelled.
const CONTENT_MODIFIED_CODE: number = -32801; // report such error if semantic token request is outdated while content modified.
const INTERNAL_ERROR_CODE: number = -32603; // Internal Error.
let lspUsageStats: HybridLSPStats;
async function traceLSPPerformance(javaExt: vscode.Extension<any>) {
   const javaExtVersion = javaExt.packageJSON?.version;
   const isPreReleaseVersion = /^\d+\.\d+\.\d{10}/.test(javaExtVersion);
   const redHatTelemetryEnabled = workspace.getConfiguration('redhat.telemetry').get('enabled', false);
   const isTreatment = !isPreReleaseVersion &&
      (redHatTelemetryEnabled || await getExpService()?.getTreatmentVariableAsync(TreatmentVariables.VSCodeConfig, TreatmentVariables.JavaCompletionSampling, true /*checkCache*/));
   const sampling: string = isPreReleaseVersion ? "pre-release" : (isTreatment ? "sampling" : "");
   if (!isPreReleaseVersion && !isTreatment) {
      return;
   }

   // Enable it since redhat.java@1.23.0
   if (javaExt.exports?.onWillRequestStart) {
      lspUsageStats = new HybridLSPStats(javaExtVersion, sampling);
      try {
         // Load HdrHistogramJS WASM module
         if (vscode.env.uiKind === vscode.UIKind.Desktop) {
            hdr.initWebAssemblySync();
         } else if (vscode.env.uiKind === vscode.UIKind.Web) {
            await hdr.initWebAssembly();
         }
      } catch (error) {
         sendError({
            name: "hdr-assembly-load-error",
            message: "hdr-wasm-load-error: " + (<any> error)?.message,
            stack: (<any> error)?.stack,
         });
      }
   }
   // Trace the request start
   javaExt.exports?.onWillRequestStart?.((traceEvent: any) => {
      lspUsageStats?.recordRequestStart(traceEvent.type, traceEvent.fromSyntaxServer);
   });
   // Trace the interested LSP requests performance
   javaExt.exports?.onDidRequestEnd?.((traceEvent: any) => {
      const duration = Math.trunc(traceEvent.duration);
      const fromSyntaxServer = (traceEvent.fromSyntaxServer === undefined) ?
            "" : String(traceEvent.fromSyntaxServer);
      lspUsageStats?.recordRequestEnd(traceEvent.type, traceEvent.fromSyntaxServer);
      lspUsageStats?.recordDuration(traceEvent.type, duration, traceEvent.fromSyntaxServer);
      // Trace the timeout requests
      if (traceEvent.duration > 5000) {
         sendInfo("", {
            name: "lsp.timeout",
            kind: escapeLspRequestName(traceEvent.type),
            duration,
            javaversion: javaExtVersion,
            remark: sampling,
            fromSyntaxServer,
         });
         lspUsageStats?.record5STimeoutRequest(traceEvent.type, traceEvent.fromSyntaxServer);
      } else if (traceEvent.duration > 1000) {
         lspUsageStats?.record1STimeoutRequest(traceEvent.type, traceEvent.fromSyntaxServer);
      }

      if (traceEvent.error) {
         let code: number = traceEvent.error?.code || 0;
         let errorMessage: string = traceEvent.error?.message || String(traceEvent.error);
         let exception: string = "";
         if (code === CANCELLATION_CODE || code === CONTENT_MODIFIED_CODE) {
            return;
         }

         lspUsageStats?.recordErrorRequest(traceEvent.type, traceEvent.fromSyntaxServer);
         // See https://github.com/eclipse-lsp4j/lsp4j/commit/bf22871f4e669a2d7fd97ce046cb50903aa68120#diff-3b3e5d6517a47e0459195078645a0837aafa4d4520fe79b1cb1922a749074748
         // lsp4j will wrap the error message as "Internal error."
         // when it encounters an uncaught exception from jdt language server.
         if (code === INTERNAL_ERROR_CODE) {
            const originalException = resolveActualCause(traceEvent.error.data);
            if (originalException) {
               errorMessage = errorMessage + " " + originalException.message;
               exception = originalException.stack.join("\n");
            }
         }

         sendInfo("", {
            name: "lsp",
            kind: escapeLspRequestName(traceEvent.type),
            duration,
            code,
            message: errorMessage,
            exception,
            javaversion: javaExtVersion,
            remark: sampling,
            data: redactDataProperties(traceEvent.data),
            fromSyntaxServer,
         });
         return;
      }

      if (INTERESTED_REQUESTS.has(traceEvent.type)) {
         // See https://github.com/redhat-developer/vscode-java/pull/3010
         // to exclude the invalid completion requests.
         if (!traceEvent.resultLength && traceEvent.type === "textDocument/completion"
            && (traceEvent.data?.triggerKind === undefined || traceEvent.data?.triggerCharacter === ' ')) {
            return;
         }

         sendInfo("", {
            name: "lsp",
            kind: escapeLspRequestName(traceEvent.type),
            duration,
            resultsize: traceEvent.resultLength === undefined ? "" : String(traceEvent.resultLength),
            javaversion: javaExtVersion,
            remark: sampling,
            data: redactDataProperties(traceEvent.data),
            fromSyntaxServer,
         });
      }

      if (traceEvent.resultLength === 0) {
         lspUsageStats?.recordNoResultRequest(traceEvent.type, traceEvent.fromSyntaxServer);
      }
   });
}

function redactDataProperties(data: any): string {
   if (data?.triggerKind !== undefined) {
      return JSON.stringify(data);
   }

   return "";
}

async function traceJavaExtension(javaExt: vscode.Extension<any>) {
   const javaExtVersion = javaExt.packageJSON?.version;
   const isPreReleaseVersion = /^\d+\.\d+\.\d{10}/.test(javaExtVersion);
   javaExt.exports?.trackEvent?.((event: any) => {
      const metrics: any = {
         name: "javaext-trace",
         kind: event.name,
         javaversion: javaExtVersion,
         remark: isPreReleaseVersion ? "pre-release" : "stable",
      };

      for (const key of Object.keys(event?.properties || {})) {
         const val = event.properties[key];
         if(typeof val == "object" || typeof val == "function") { // non-primitive value
            metrics[key] = JSON.stringify(val);
         } else { // primitive value
            metrics[key] = val;
         }
      }
      sendInfo("", metrics);
   });
}

function traceSessionStatus(javaExt: vscode.Extension<any>) {
   let initHandled: boolean = false;
   javaExt.exports?.onDidRequestEnd?.((traceEvent: any) => {
      if (initHandled) {
         return;
      }

      if (traceEvent?.type === "initialize") {
         initHandled = true;
         daemon.logWatcher.checkIfUnsavedWorkspace().then((unsaved) => {
            if (unsaved) {
               sendInfo("", {
                  name: "unsaved-workspace",
               });
            }
         });
      }
   });
}

let corruptedCacheDetected: boolean = false;
async function checkIfJavaServerCrashed(wait: number = 0/*ms*/) {
   if (corruptedCacheDetected) {
      return;
   }

   // wait Java Language Server to start
   if (wait) {
      await delay(wait);
   }

   // TODO: not to call start() repeatedly. @testforstephen
   // daemon.processWatcher.start() can return false when there is no embedded jre, where you cannot judge whether the process is started or not.
   const corruptedCache = !await daemon.processWatcher.start() && await daemon.logWatcher.checkIfWorkspaceCorrupted();
   if (!corruptedCacheDetected && corruptedCache) {
      corruptedCacheDetected = true;
      sendInfo("", {
         name: "corrupted-cache",
      });
      const ans = await vscode.window.showErrorMessage("Java extension cannot start due to corrupted workspace cache, please try to clean the workspace.",
                     "Clean and Restart");
      if (ans === "Clean and Restart") {
         sendInfo("", {
            name: "clean-cache-action",
         });
         vscode.commands.executeCommand("java.clean.workspace", true);
      } else {
         sendInfo("", {
            name: "clean-cache-cancel-action",
         });
      }
   }
}

/**
 * To avoid the LSP request name get redacted.
 */
function escapeLspRequestName(name: string) {
   return name.replace(/\//g, "-")
}

interface Exception {
   message: string;
   stack: string[];
}

function resolveActualCause(callstack: any): Exception | undefined {
   if (!callstack) {
      return;
   }

   const callstacks = callstack.split(/\r?\n/);
   if (callstacks?.length) {
      for (let i = callstacks.length - 1; i >= 0; i--) {
         if (callstacks[i]?.startsWith("Caused by:")) {
            return {
               message: callstacks[i],
               stack: callstacks.slice(i),
            };
         }
      }
   }

   return;
}

export function sendLSPUsageStats() {
   if (lspUsageStats) {
      lspUsageStats.sendStats();
   }
}

class HybridLSPStats {
   private lspStats: LSPUsageStats; // standard lsp stats
   private ssLspStats: LSPUsageStats; // syntax server lsp stats

   public constructor(readonly javaExtVersion: string, readonly sampling: string) {
      this.lspStats = new LSPUsageStats(javaExtVersion, sampling, false);
      this.ssLspStats = new LSPUsageStats(javaExtVersion, sampling, true);
   }

   public recordRequestStart(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.recordRequestStart(type);
      } else {
         this.lspStats.recordRequestStart(type);
      }
   }

   public recordRequestEnd(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.recordRequestEnd(type);
      } else {
         this.lspStats.recordRequestEnd(type);
      }
   }

   public recordDuration(type: string, duration: number, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.recordDuration(type, duration);
      } else {
         this.lspStats.recordDuration(type, duration);
      }
   }

   public record1STimeoutRequest(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.record1STimeoutRequest(type);
      } else {
         this.lspStats.record1STimeoutRequest(type);
      }
   }

   public record5STimeoutRequest(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.record5STimeoutRequest(type);
      } else {
         this.lspStats.record5STimeoutRequest(type);
      }
   }

   public recordErrorRequest(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.recordErrorRequest(type);
      } else {
         this.lspStats.recordErrorRequest(type);
      }
   }

   public recordNoResultRequest(type: string, fromSyntaxServer?: boolean) {
      if (fromSyntaxServer) {
         this.ssLspStats.recordNoResultRequest(type);
      } else {
         this.lspStats.recordNoResultRequest(type);
      }
   }

   public sendStats() {
      this.lspStats.sendStats();
      this.ssLspStats?.sendStats();
   }
}

class LSPUsageStats {
   private requestStarts: { [key: string]: number } = {};
   private requestEnds: { [key: string]: number } = {};
   private s1TimeoutRequests: { [key: string]: number } = {};
   private s5TimeoutRequests: { [key: string]: number } = {};
   private errorRequests: { [key: string]: number } = {};
   private noResultRequests: { [key: string]: number } = {};
   private hdrs: { [key: string]: HDR } = {};
   public constructor(readonly javaExtVersion: string, readonly sampling: string, readonly fromSyntaxServer: boolean = false) {
   }

   public recordRequestStart(type: string) {
      this.requestStarts[type] = (this.requestStarts[type] || 0) + 1;
   }

   public recordRequestEnd(type: string) {
      this.requestEnds[type] = (this.requestEnds[type] || 0) + 1;
   }

   public recordDuration(type: string, duration: number) {
      this.hdrs[type] = this.hdrs[type] || new HDR();
      this.hdrs[type].record(duration);
   }

   public record1STimeoutRequest(type: string) {
      this.s1TimeoutRequests[type] = (this.s1TimeoutRequests[type] || 0) + 1;
   }

   public record5STimeoutRequest(type: string) {
      this.s5TimeoutRequests[type] = (this.s5TimeoutRequests[type] || 0) + 1;
   }

   public recordErrorRequest(type: string) {
      this.errorRequests[type] = (this.errorRequests[type] || 0) + 1;
   }

   public recordNoResultRequest(type: string) {
      this.noResultRequests[type] = (this.noResultRequests[type] || 0) + 1;
   }

   public sendStats() {
      const startAt = Date.now();
      if (Object.keys(this.requestStarts).length) {
         const data: any = {};
         for (const key of Object.keys(this.requestStarts)) {
            const simpleKey = escapeLspRequestName(this.getSimpleKey(key));
            const hdrObj = this.hdrs[key];
            data[simpleKey] = [
                        this.requestStarts[key] - (this.requestEnds[key] || 0), // the number of requests that are not ended.
                        this.requestEnds[key] || 0, // the number of requests that are ended.
                        this.s1TimeoutRequests[key] || 0, // the number of requests that are ended more than 1s.
                        this.s5TimeoutRequests[key] || 0, // the number of requests that are ended more than 5s.
                        this.errorRequests[key] || 0, // the number of requests that are ended with error.
                        this.noResultRequests[key] || 0, // the number of requests that are ended with empty result.
                        hdrObj?.getPercentile(50) || 0, // the 50th percentile of the request duration.
                        hdrObj?.getPercentile(75) || 0, // the 75th percentile of the request duration.
                        hdrObj?.getPercentile(90) || 0, // the 90th percentile of the request duration.
                        hdrObj?.getPercentile(95) || 0, // the 95th percentile of the request duration.
                        hdrObj?.getPercentile(99) || 0, // the 99th percentile of the request duration.
            ];
            hdrObj?.destroy();
         }
         const duration = Date.now() - startAt;
         sendInfo("", {
            name: this.fromSyntaxServer ? "lsp.ss.aggregate.v1" : "lsp.aggregate.v1",
            javaversion: this.javaExtVersion,
            remark: this.sampling,
            data: JSON.stringify(data),
            duration,
         });
      }
   }

   private getSimpleKey(key: string): string {
      if (key.startsWith("workspace/executeCommand/")) {
         return key.replace("workspace/executeCommand/", "we/");
      }
      if (key.startsWith("textDocument/")) {
         return key.replace("textDocument/", "td/");
      }
      return key;
   }
}

class HDR {
   private histogram: hdr.Histogram | undefined;

   public constructor() {
      try {
         this.histogram = hdr.build({
            bitBucketSize: "packed",          // may be 8, 16, 32, 64 or 'packed'
            autoResize: true,                 // default value is true
            lowestDiscernibleValue: 1,        // default value is also 1
            highestTrackableValue: 2,         // can increase up to Number.MAX_SAFE_INTEGER
            numberOfSignificantValueDigits: 3, // Number between 1 and 5 (inclusive)
            useWebAssembly: true,             // default value is false, see WebAssembly section for details
         });
      } catch (error) {
         // skip
      }
   }

   public record(value: number) {
      this.histogram?.recordValue(value);
   }

   public getPercentile(percentile: number): number {
      return this.histogram?.getValueAtPercentile(percentile) || 0;
   }

   public destroy() {
      this.histogram?.destroy();
   }
}
