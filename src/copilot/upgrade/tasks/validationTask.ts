import * as vscode from 'vscode';
import { MigrationTaskResult } from "../constants";
import { CommandTask } from './commandTask';
import { MigrationTask } from "./migrationTask";


export class ValidationTask implements MigrationTask {

    async execute(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        stream.progress('building your project...');
        const result = await new CommandTask("mvn clean package").execute(stream, token);
        if (result.success) {
            stream.markdown('Your project has already upgrade to java 17 now! \n');
            stream.markdown('Please enjoy your coding with new java runtime! \n');
            return Promise.resolve({ success: true });
        } else {
            return result;
        }
    }

}
