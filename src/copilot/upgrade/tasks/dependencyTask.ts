import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Dependency, MigrationTaskResult } from "../constants";
import { CommandTask } from './commandTask';
import { MigrationTask } from "./migrationTask";
import { logger } from '../../logger';


export class DependencyTask implements MigrationTask {
    dependency: Dependency;

    constructor(dependency: Dependency) {
        this.dependency = dependency;
    }

    async execute(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        stream.progress(`adding dependency ${this.dependency.groupId}:${this.dependency.artifactId}:`);
        const tempFilePath = path.join(os.tmpdir(), 'tempfile.txt');
        const content = `
        type: specs.openrewrite.org/v1beta/recipe
        name: com.microsoft.azure.AddDependecy
        displayName: Add Missing dependencies
        description: Adds ${this.dependency.artifactId} to the pom.xml
        tags: [Java, Maven, XML]
        recipeList:
          - org.openrewrite.maven.AddDependency:
              groupId: ${this.dependency.groupId}
              artifactId: ${this.dependency.artifactId}
              version: ${this.dependency.version}
              scope: ${this.dependency.scope}
          - org.openrewrite.maven.ChangeDependencyScope:
              groupId: ${this.dependency.groupId}
              artifactId: ${this.dependency.artifactId}
              newScope: ${this.dependency.scope}
       `;
        fse.writeFile(tempFilePath, content, {}, (err: Error) => {
            logger.error(err);
        });
        return new CommandTask(`mvn org.openrewrite.maven:rewrite-maven-plugin:runNoFork "-Drewrite.recipeArtifactCoordinates=org.openrewrite.maven:rewrite-maven-plugin:LATEST" "-Drewrite.activeRecipes=com.microsoft.azure.AddDependecy" "-Drewrite.configLocation=${tempFilePath}"`).execute(stream, token);
    }

}
