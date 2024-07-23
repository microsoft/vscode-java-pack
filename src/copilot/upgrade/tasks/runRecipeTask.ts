import * as vscode from 'vscode';
import { MigrationTaskResult, RecipeRecord } from '../constants';
import { CommandTask } from './commandTask';


export class RunRecipeTask extends CommandTask {
    private recipe: RecipeRecord;

    constructor(recipe: RecipeRecord) {
        super(`mvn -U org.openrewrite.maven:rewrite-maven-plugin:run "-Drewrite.recipeArtifactCoordinates=${recipe.groupId}:${recipe.artifactId}:LATEST" "-Drewrite.activeRecipes=${recipe.id}"`);
        this.recipe = recipe;
    }

    public async execute(stream: vscode.ChatResponseStream, _token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        stream.progress(`running recipe ${this.recipe.id}...`);
        const result = await super.execute(stream, _token);
        if (result.success) {
            this.recipe.complete = true;
        }
        return result;
    }
}
