import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";

export class LogWatcher {
    private serverLogUri: vscode.Uri | undefined;

    constructor(context: vscode.ExtensionContext) {
        if (context.storageUri) {
            const javaExtStoragePath: string = path.join(context.storageUri.fsPath, "..", "redhat.java");
            const serverLogPath: string = path.join(javaExtStoragePath, "jdt_ws", ".metadata", ".log");
            this.serverLogUri = context.storageUri.with({path: serverLogPath});
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
            const watcher = fs.watch(this.serverLogUri.fsPath);
            watcher.on("change", (eventType, filename) => {
                console.log(eventType, filename);
            })
        } catch (error) {
            sendInfo("", {name: "no-server-log"});
        }

    }

}