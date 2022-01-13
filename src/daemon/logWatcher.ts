import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";

export class LogWatcher {
    private serverLogUri: vscode.Uri | undefined;
    private offset: number = 0;

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
            const logPath = this.serverLogUri.fsPath;
            setInterval(async () => {
                const content = await fs.promises.readFile(logPath, {encoding: 'utf-8'});
                if (!content.endsWith(os.EOL)) {return;}
                const newContent = content.slice(this.offset);
                this.offset = content.length; 

                const m = newContent.match(/.*exception.*/i);
                if (m) {
                    const start = m.index;
                    const end = newContent.slice(start).indexOf(`${os.EOL}${os.EOL}`);
                    console.log(newContent.slice(start, end));
                }
            }, 5000)
        } catch (error) {
            sendInfo("", {name: "no-server-log"});
        }

    }

}