// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as vscode from "vscode";
import * as path from "path";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "../daemon";

export class ClientLogWatcher {
    private context: vscode.ExtensionContext;
    private javaExtensionRoot: vscode.Uri | undefined;
    private logProcessedTimestamp: number = Date.now();
    private interestedLspRequests: string[] = ["textDocument\\/completion"];
    private lspTracePatterns: Map<string, RegExp> = new Map();

    constructor(daemon: LSDaemon) {
        this.context = daemon.context;
        if (this.context.storageUri) {
            this.javaExtensionRoot = vscode.Uri.joinPath(this.context.storageUri, "..", "redhat.java");
        }
        if (this.interestedLspRequests.length > 0) {
            for (const request of this.interestedLspRequests) {
                this.lspTracePatterns.set(request, new RegExp(`\\[Trace.*\\] Received response \'${request}.*\' in (\\d+)ms`));
            }
        }
    }

    public async collectInfoFromLog() {
        const logs = await this.getLogs();
        if (logs) {
            for (const log of logs) {
                if (log.message?.startsWith("Use the JDK from") && Date.parse(log.timestamp) > this.logProcessedTimestamp) {
                    const info: any = {};
                    info.defaultProjectJdk = log?.message.replace("Use the JDK from '", "").replace("' as the initial default project JDK.", "");

                    const startupLog = logs.find(log => log.message?.startsWith("Starting Java server with:") && log.message.endsWith("jdt_ws") /* limit to standard server */);
                    if (startupLog) {
                        info.xmx = startupLog.message.match(/-Xmx[0-9kmgKMG]+/g)?.[0];
                        info.xms = startupLog.message.match(/-Xms[0-9kmgKMG]+/g)?.[0];
                        info.lombok = startupLog.message.includes("lombok.jar") ? "true" : undefined;
                        info.workspaceType = startupLog.message.match(/-XX:HeapDumpPath=.*(vscodesws)/) ? "vscodesws": "folder";
                    }

                    const errorLog = logs.find(log => log.level === "error");
                    info.error = errorLog ? "true" : undefined;

                    const missingJar = "Error opening zip file or JAR manifest missing"; // lombok especially
                    if (logs.find(log => log.message?.startsWith(missingJar))) {
                        info.error = missingJar;
                    }

                    const crashLog = logs.find(log => log.message?.startsWith("The Language Support for Java server crashed and will restart."));
                    info.crash = crashLog ? "true" : undefined;

                    sendInfo("", {
                        name: "client-log-startup-metadata",
                        ...info
                    });
                } else {
                    for (const key of this.lspTracePatterns.keys()) {
                        const regexp: RegExp = this.lspTracePatterns.get(key)!;
                        const match = log.message?.match(regexp);
                        if (match?.length === 2) {
                            sendInfo("", {
                                name: "perf-trace",
                                kind: key.replace("\\", ""),
                                time: match[1],
                            });
                        }
                    }
                }
            }
        }
    }

    public async getLogs() {
        const rawBytes = await this.readLatestLogFile();
        if (rawBytes) {
            const content = rawBytes.toString();
            return parse(content);
        } else {
            return undefined;
        }
    }

    private async readLatestLogFile() {
        if (!this.javaExtensionRoot) {
            try {
                this.javaExtensionRoot = vscode.Uri.file(path.dirname(await vscode.commands.executeCommand("_java.workspace.path")));
            } catch (error) {
            }
        }

        if (this.javaExtensionRoot) {
            const files = await vscode.workspace.fs.readDirectory(this.javaExtensionRoot);
            const logFiles = files.filter(elem => elem[0].startsWith("client.log")).sort((a, b) => compare_file(a[0], b[0]));
            if (logFiles.length > 0) {
                const latestLogFile = logFiles[logFiles.length - 1][0];
                const uri = vscode.Uri.joinPath(this.javaExtensionRoot, latestLogFile);
                return await vscode.workspace.fs.readFile(uri);
            }
        }
        return undefined;
    }
}
/**
 * filename: client.log.yyyy-mm-dd.r 
 */
function compare_file(a: string, b: string) {
    const dateA = a.slice(11, 21), dateB = b.slice(11, 21);
    if (dateA === dateB) {
        if (a.length > 22 && b.length > 22) {
            const extA = a.slice(22), extB = b.slice(22);
            return parseInt(extA) - parseInt(extB);
        } else {
            return a.length - b.length;
        }
    } else {
        return dateA < dateB ? -1 : 1;
    }
}

function parse(rawLog: string) {
    const SEP = /\r?\n/;
    const START = "{";
    const END= "}";

    const ret = [];

    let current: { [key: string]: string } | undefined = undefined;
    for(const line of rawLog.split(SEP)) {
        if (line === START) {
            current = {};
        } else if (line === END) {
            if (current !== undefined) {
                ret.push(current);
                current = undefined;
            }
        } else {
            if (current !== undefined) {
                const m = line.match(/^\s*(.*):\s['"](.*?)['"],?$/);
                if (m) {
                    current[m[1]] = m[2];
                }
            }
        }
    }
    return ret;
}