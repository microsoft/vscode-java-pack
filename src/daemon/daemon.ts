// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ClientLogWatcher } from "./clientLog/logWatcher";
import { ProcessWatcher } from "./processWatcher";
import { LogWatcher } from "./serverLog/logWatcher";

export class LSDaemon {

    public logWatcher: LogWatcher;
    public processWatcher: ProcessWatcher;
    public clientLogWatcher: ClientLogWatcher;

    constructor(public context: vscode.ExtensionContext) {
        this.processWatcher = new ProcessWatcher(this);
        this.logWatcher = new LogWatcher(this);
        this.clientLogWatcher = new ClientLogWatcher(this)
    }

    public async initialize() {
        await this.logWatcher.start();
        setTimeout(() => {
            this.clientLogWatcher.collectInfoFromLog();
        }, 10 * 1000); // wait a while when JDTLS has been launched
    }


}