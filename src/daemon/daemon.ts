import * as vscode from "vscode";
import { ProcessWatcher } from "./processWatcher";
import { LogWatcher } from "./serverLog/logWatcher";


export class LSDaemon {

    public logWatcher: LogWatcher;
    public processWatcher: ProcessWatcher;

    constructor(public context: vscode.ExtensionContext) {
        this.processWatcher = new ProcessWatcher(this);
        this.logWatcher = new LogWatcher(this);
    }

    public async initialize() {
        await this.logWatcher.start();
    }


}