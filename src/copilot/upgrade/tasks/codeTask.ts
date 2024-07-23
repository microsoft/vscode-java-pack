import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageModelChatMessageRole } from 'vscode';
import { CODE_FIX_EXAMPLE_RESPONSE, CODE_FIX_EXAMPLE_USER_INPUT, CODE_FIX_SYSTEM_MESSAGE, CodeChanges, CodeSolution, ErrorAnalysis, MigrationTaskResult } from "../constants";
import { AI_RETRY_TIMES, MigrationJob } from '../migrate';
import { getResponseContent } from "../utils";
import { MigrationTask } from "./migrationTask";


export class CodeTask implements MigrationTask {
    error: string;
    analysis: ErrorAnalysis;
    job: MigrationJob;

    constructor(error: string, analysis: ErrorAnalysis, job: MigrationJob) {
        this.error = error;
        this.analysis = analysis;
        this.job = job;
    }

    async execute(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        stream.progress('analyzing exception with AI...');
        const solution = this.analysis.solution as CodeSolution;
        const readFilePromises = solution?.files.map(async (f) => {
            const file = (await vscode.workspace.findFiles('**/*', '**/{node_modules,target}/**'))
                .filter(uri => uri.fsPath.includes(f.file))[0];
            const content = await vscode.workspace.fs.readFile(file);
            return {
                file: vscode.workspace.asRelativePath(file),
                content: new TextDecoder().decode(content)
            };
        });
        const request = {
            report: this.error,
            dependencies: await this.job.getDependencies(),
            solution: this.analysis.description,
            files: await Promise.all(readFilePromises)
        };
        const messages = [
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, CODE_FIX_SYSTEM_MESSAGE),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, CODE_FIX_EXAMPLE_USER_INPUT),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, CODE_FIX_EXAMPLE_RESPONSE),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, JSON.stringify(request))
        ];
        let changes: CodeChanges[] = [];
        // todo use better method to check whether ai returns empty content
        for (let i = 0; i < AI_RETRY_TIMES && changes.length == 0; i++) {
            try {
                const response = await (await this.job.getLanaugageModel()).sendRequest(messages, {}, token);
                const content = await getResponseContent(response);
                changes = JSON.parse(content) as CodeChanges[];
            } catch (ignore: any) {
                continue;
            }
        }
        for (const change of changes) {
            stream.progress(`applying changes to file: ${change.path}...`);
            const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const uri = vscode.Uri.file(path.join(rootPath, change.path));
            await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(change.content));
        }
        return { success: true };
    }

}
