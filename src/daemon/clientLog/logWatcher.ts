// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as vscode from "vscode";
import * as path from "path";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { LSDaemon } from "../daemon";

const lombokJarRegex = /lombok-\d+.*\.jar/;

export class ClientLogWatcher {
    private context: vscode.ExtensionContext;
    private javaExtensionRoot: vscode.Uri | undefined;
    private logProcessedTimestamp: number = Date.now();
    private interestedLspRequests: string[] = ["textDocument\\/completion"];
    private lspTracePatterns: Map<string, RegExp> = new Map();
    // statistics of the interested lsp requests. 
    private perfTraces: Map<string, {time: number; count: number}> = new Map();

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
        let logs = await this.getLogs();
        if (logs) {
            logs = logs.reverse();
            let sessionCount = 0;
            for (const log of logs) {
                if (log.message?.startsWith("Use the JDK from")) {
                    if (++sessionCount > 1) {
                        // only the lsp traces from last session should be collected.
                        break;
                    }

                    if (Date.parse(log.timestamp) < this.logProcessedTimestamp) {
                        continue;
                    }
                    const info: any = {};
                    info.defaultProjectJdk = log?.message.replace("Use the JDK from '", "").replace("' as the initial default project JDK.", "");

                    const startupLog = logs.find(log => log.message?.startsWith("Starting Java server with:") && log.message.endsWith("jdt_ws") /* limit to standard server */);
                    if (startupLog) {
                        info.xmx = startupLog.message.match(/-Xmx[0-9kmgKMG]+/g)?.[0];
                        info.xms = startupLog.message.match(/-Xms[0-9kmgKMG]+/g)?.[0];
                        if (startupLog.message.includes("lombok.jar")) {
                            info.lombok = "true"; // using old version of 3rd party lombok extension
                        } else if (startupLog.message.match(lombokJarRegex)) {
                            info.lombok = "embedded"; // lombok projects, loading embedded lombok.jar
                        }
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
                            const time = parseInt(match[1]);
                            if (Number.isNaN(time)) {
                                continue;
                            }
                            let statistics: { time: number; count: number; } | undefined = this.perfTraces.get(key);
                            if (!statistics) {
                                statistics = {
                                    time,
                                    count: 1,
                                };
                            } else {
                                statistics.time += time;
                                statistics.count++;
                            }
                            this.perfTraces.set(key, statistics);
                        }
                    }
                }
            }
        }

        this.sendPerfStatistics();
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

    private sendPerfStatistics() {
        for (let [key, value] of this.perfTraces) {
            sendInfo("", {
                name: "perf-trace",
                kind: escapeLspRequestName(key),
                time: value.time,
                count: value.count,
            });
        }
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

/**
 * To avoid the LSP request name get redacted.
 */
function escapeLspRequestName(name: string) {
    return name.replace("\\/", "-");
}