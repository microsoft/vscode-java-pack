import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "../daemon";
import { collectErrors, collectErrorsSince, logsForLatestSession, sessionMetadata } from "./logUtils";
import { toElapsed } from "./utils";

export class LogWatcher {
    private serverLogUri: vscode.Uri | undefined;
    private logProcessedTimestamp: number = Date.now();
    private context: vscode.ExtensionContext;
    constructor(daemon: LSDaemon) {
        this.context = daemon.context;
        if (this.context.storageUri) {
            const javaExtStoragePath: string = path.join(this.context.storageUri.fsPath, "..", "redhat.java");
            const serverLogPath: string = path.join(javaExtStoragePath, "jdt_ws", ".metadata");
            this.serverLogUri = this.context.storageUri.with({path: serverLogPath});
        }
    }

    /**
     * start
     */
    public async start() {
        if (!this.serverLogUri) {
            sendInfo("", {name: "no-server-log"});
            return;
        } 

        try {
            await fs.promises.access(this.serverLogUri.fsPath);
        } catch (error) {
            sendInfo("", {name: "no-server-log"});
            return;
        }

        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.serverLogUri, "*.log"));
        watcher.onDidChange(async (e)=> {
            if (Date.now() - this.logProcessedTimestamp < 1000) {return;} // reduce frequency of log file I/O.
            const logs = await logsForLatestSession(e.fsPath);
            const errors = collectErrorsSince(logs, this.logProcessedTimestamp);
            if (errors) {
                errors.forEach(e => {
                    sendInfo("", {
                        name: "jdtls-error",
                        error: e.entry,
                        timestamp: e.timestamp!.toString()
                    });
                })
            }
            this.logProcessedTimestamp = Date.now();
        });

    }

    /**
     * metadata
     */
    public async sendStartupMetadata(remark?: string) {
        if (this.serverLogUri){
           const logs = await logsForLatestSession(path.join(this.serverLogUri?.fsPath, ".log"));
           const metadata = sessionMetadata(logs);
            sendInfo("", {
                name: "jdtls-startup-metadata",
                remark: remark!,
                javaVersion: metadata.javaVersion!,
                javaVendor: metadata.javaVendor!,
                initializeAt: toElapsed(metadata.startAt, metadata.initializeAt)!,
                initializedAt: toElapsed(metadata.startAt, metadata.initializedAt)!,
                importGradleAt: toElapsed(metadata.startAt, metadata.importGradleAt)!,
                importMavenAt: toElapsed(metadata.startAt, metadata.importMavenAt)!,
                initJobFinishedAt: toElapsed(metadata.startAt, metadata.initJobFinishedAt)!,
                buildJobsFinishedAt: toElapsed(metadata.startAt, metadata.buildJobsFinishedAt)!,
            });
        }
    }

    public async sendErrorAndStackOnCrash() {
        if (this.serverLogUri){
           const logs = await logsForLatestSession(path.join(this.serverLogUri?.fsPath, ".log"));
            const errors = collectErrors(logs, {includingStack: true});
            if (errors) {
                errors.forEach(e => {
                    sendInfo("", {
                        name: "jdtls-error-in-crashed-session",
                        error: e.entry,
                        timestamp: e.timestamp!
                    });
                })
            }
        }
    }
}
