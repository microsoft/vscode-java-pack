// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "../daemon";
import { collectErrors, collectErrorsSince, containsCorruptedException, isUnsavedWorkspace, logsForLatestSession, sessionMetadata } from "./logUtils";
import { toElapsed } from "./utils";
import { redact } from "./whitelist";

export class LogWatcher {
    private serverLogUri: vscode.Uri | undefined;
    private logProcessedTimestamp: number = Date.now();
    private context: vscode.ExtensionContext;
    private watcher: vscode.FileSystemWatcher | undefined;
    constructor(daemon: LSDaemon) {
        this.context = daemon.context;
        if (this.context.storageUri) {
            const javaExtStoragePath: string = path.join(this.context.storageUri.fsPath, "..", "redhat.java");
            const serverLogPath: string = path.join(javaExtStoragePath, "jdt_ws", ".metadata");
            this.serverLogUri = this.context.storageUri.with({ path: serverLogPath });
        }
    }

    /**
     * start
     */
    public async start() {
        if (!this.serverLogUri) {
            try {
                const jdtWsPath: string = await vscode.commands.executeCommand("_java.workspace.path");
                this.serverLogUri= vscode.Uri.file(path.join(jdtWsPath, ".metadata"));
            } catch (error) {
            }
        }

        if (!this.serverLogUri) {
            sendInfo("", { name: "no-server-log" });
            return;
        }

        try {
            await fs.promises.access(this.serverLogUri.fsPath);
        } catch (error) {
            sendInfo("", { name: "no-server-log" });
            return;
        }

        this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.serverLogUri, "*.log"));
        this.watcher.onDidChange(async (e) => {
            if (Date.now() - this.logProcessedTimestamp < 1000) { return; } // reduce frequency of log file I/O.
            const logs = await logsForLatestSession(e.fsPath);
            const errors = collectErrorsSince(logs, this.logProcessedTimestamp);
            const consentToCollectLogs = vscode.workspace.getConfiguration("java").get<boolean>("help.collectErrorLog") ?? false;
            if (errors) {
                errors.forEach(e => {
                    const {message, tags, hash} = redact(e.message, consentToCollectLogs);
                    const infoBody: {[key: string]: any} = {
                        name: "jdtls-error",
                        error: message,
                        tags: tags.join(","),
                        hash: hash,
                        timestamp: e.timestamp!.toString()
                    };
                    if (consentToCollectLogs && e.stack) {
                        infoBody.stack = e.stack;
                    }
                    sendInfo("", infoBody);
                })
            }
            this.logProcessedTimestamp = Date.now();
        });
    }

    public stop() {
        if (this.watcher) {
            this.watcher.dispose()
            this.watcher = undefined;
        }
    }

    /**
     * metadata
     */
    public async sendStartupMetadata(remark?: string) {
        if (this.serverLogUri) {
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
        if (this.serverLogUri) {
            const logs = await logsForLatestSession(path.join(this.serverLogUri?.fsPath, ".log"));
            const errors = collectErrors(logs);
            const consentToCollectLogs = vscode.workspace.getConfiguration("java").get<boolean>("help.collectErrorLog") ?? false;
            if (errors) {
                errors.forEach(e => {
                    const {message, tags, hash} = redact(e.message, consentToCollectLogs);
                    const infoBody: {[key: string]: any} = {
                        name: "jdtls-error-in-crashed-session",
                        error: message,
                        tags: tags.join(","),
                        hash: hash,
                        timestamp: e.timestamp!.toString()
                    };
                    if (consentToCollectLogs && e.stack) {
                        infoBody.stack = e.stack;
                    }
                    sendInfo("", infoBody);
                })
            }
        }
    }

    public async checkIfWorkspaceCorrupted(): Promise<boolean> {
        if (this.serverLogUri) {
            const logs = await logsForLatestSession(path.join(this.serverLogUri?.fsPath, ".log"));
            return containsCorruptedException(logs);
        }

        return false;
    }

    public async checkIfUnsavedWorkspace(): Promise<boolean> {
        if (this.serverLogUri) {
            const logs = await logsForLatestSession(path.join(this.serverLogUri?.fsPath, ".log"));
            return isUnsavedWorkspace(logs);
        }

        return false;
    }
}
