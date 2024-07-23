import * as vscode from 'vscode';
import { MigrationTaskResult } from "../constants";
import { getErrorStacksFromOutput } from '../migrate';
import { executeCommandAndGetResponse } from "../utils";
import { MigrationTask } from "./migrationTask";


export class CommandTask implements MigrationTask {
    private command: string;

    constructor(command: string) {
        this.command = command;
    }

    public async execute(_stream: vscode.ChatResponseStream, _token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        const result = await executeCommandAndGetResponse(this.command);
        return { success: result.isSuccess, output:result.output, errorStack: result.isSuccess ? undefined : getErrorStacksFromOutput(result.output) };
    }
}
