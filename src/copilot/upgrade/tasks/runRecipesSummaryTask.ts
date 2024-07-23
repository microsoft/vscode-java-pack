import * as vscode from 'vscode';
import { MigrationTaskResult, Recipe } from "../constants";
import { MigrationTask } from "./migrationTask";


export class RunRecipesSummaryTask implements MigrationTask {
    private recipes: Recipe[];

    constructor(recipes: Recipe[]) {
        this.recipes = recipes;
    }

    public async execute(stream: vscode.ChatResponseStream, _token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        stream.markdown(`All recipes has been applied successfully, below are the list: \n`);
        this.recipes.forEach(m => stream.markdown(`- ${m.groupId}:${m.artifactId}:${m.id} : \u{2705} \n`));
        return { success: true };
    }
}
