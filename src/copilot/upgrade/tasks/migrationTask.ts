import * as vscode from "vscode";
import { MigrationTaskResult } from "../constants";

export interface MigrationTask {
    execute(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult>;
}
