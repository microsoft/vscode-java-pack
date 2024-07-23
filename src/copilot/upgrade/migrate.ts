import { randomUUID } from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageModelChatMessageRole } from 'vscode';
import { ANALYZE_TEST_ERROR_SYSTEM_MESSAGE, CommandSolution, DependencySolution, ErrorAnalysis, FIND_RECIPES_EXAMPLE_RESPONSE_NORMAL, FIND_RECIPES_EXAMPLE_USER_INPUT_NORMAL, FIND_RECIPES_SYSTEM_MESSAGE, MigratePhase, MigrationTaskResult, RESOLVE_ERROR_SYSTEM_MESSAGE, RecipeRecord, RecipeSolution } from "./constants";
import { CodeTask } from './tasks/codeTask';
import { CommandTask } from './tasks/commandTask';
import { DependencyTask } from './tasks/dependencyTask';
import { MigrationTask } from "./tasks/migrationTask";
import { RunRecipeTask } from './tasks/runRecipeTask';
import { RunRecipesSummaryTask } from './tasks/runRecipesSummaryTask';
import { ValidationTask } from './tasks/validationTask';
import { executeCommandAndGetResponse, getResponseContent } from "./utils";

export const AI_RETRY_TIMES = 3;
const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4' };

export class MigrationJob {
    id: string;
    // meta data
    title: string;
    files: string[] | undefined;
    dependencies: string | undefined;
    // state
    phase: MigratePhase | undefined;
    recipes: RecipeRecord[] = [];
    tasks: MigrationTask[] = [];
    model: vscode.LanguageModelChat | undefined;

    // constructor
    constructor(title: string) {
        this.id = randomUUID();
        this.title = title;
    }

    sumaryCurrentStatus(stream: vscode.ChatResponseStream): void {
        stream.markdown('### Upgrade your project to Java 17 \n '); // todo: make it accepts uers' input
        stream.markdown(`- Step 1: Analyze workspace and prepare solution ${this.phase! > MigratePhase.Initialize ? '\u{2705}' : ''} \n`);
        if (this.phase === MigratePhase.Initialize) {
            return;
        }
        stream.markdown(`- Step 2: Apply code changes with recipes ${this.phase! > MigratePhase.Resolve ? '\u{2705}' : ''} \n`);
        if (this.phase == MigratePhase.Resolve) {
            return;
        }
        stream.markdown(`- Step 3: Build the project and verify changes ${this.phase! > MigratePhase.Verify ? '\u{2705}' : ''} \n`);
    }

    async collectFiles(): Promise<string[]> {
        return vscode.workspace.findFiles('**/*', '**/{node_modules,build,target,bin}/**')
            .then(files => files.map(file => vscode.workspace.asRelativePath(file)));
    }

    // get dependencies with `mvn dependency:tree`
    // todo: support gradle
    async getDependencies(): Promise<string> {
        // todo: support gradle
        const result = await executeCommandAndGetResponse('mvn dependency:tree');
        return result.isSuccess ? result.output.split('\n')
            .filter(line => !line.includes('[INFO] |  ') && !line.includes('[INFO]    ')) // workaroudn to filter first two level dependencies, to save token
            .join('\n') : '';
    }

    async getLanaugageModel(): Promise<vscode.LanguageModelChat> {
        if (!this.model) {
            const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
            this.model = model;
        }
        return Promise.resolve(this.model);
    }

    public async initialize(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        this.phase = MigratePhase.Initialize;
        this.sumaryCurrentStatus(stream);
        stream.progress('prepare recipes for migration task...');
        const recipeMessages = [
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, FIND_RECIPES_SYSTEM_MESSAGE),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, FIND_RECIPES_EXAMPLE_USER_INPUT_NORMAL),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, FIND_RECIPES_EXAMPLE_RESPONSE_NORMAL),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, await this.readBuildFile()),
        ];
        const recipesResponse = await (await this.getLanaugageModel()).sendRequest(recipeMessages, {}, token);
        const recipesResponseContent = await getResponseContent(recipesResponse);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.recipes = recipesResponseContent === '' ? [] : JSON.parse(recipesResponseContent);
        this.recipes.forEach(recipe => recipe.complete = false);
        if (this.recipes.length == 0) {
            stream.markdown('Your project is already a java 17 project, no need to upgrade \n');
            return { success: false };
        }
        stream.markdown('Java Agent has analyzed your project and here are the recipes which could upgrade your project to Java 17 \n');
        for (const recipe of this.recipes) {
            stream.markdown(`  - ${recipe.id}: \n`);
            stream.markdown(`    ${recipe.description} \n`);
        }
        return { success: true };
    }

    public async executeTasks(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        while (this.tasks?.length > 0) {
            const task = this.tasks[this.tasks.length - 1];
            const result = await task.execute(stream, token)
            if (result.success) {
                this.tasks.pop();
            } else {
                stream.markdown(`Failed to run the migration, below is the stacks: \n`);
                stream.markdown(`\`\`\`\n${result.errorStack}\n\`\`\``);
                // summary error provide users solution with text
                stream.progress('analyzing exception with AI...');

                try {
                    const analysis = await this.analyzeFailureTask(result.errorStack ?? '', token);
                    stream.markdown(`${analysis.description}`);
                    return {
                        ...result,
                        errorStack: result.errorStack,
                        errorAnalysis: analysis
                    };
                } catch (err: any) {
                    stream.markdown(`failed to analyze the exception with AI: ${err}`);
                    return result;
                }
            }
        }
        return { success: true }
    }

    async analyzeFailureTask(stack: string, token: vscode.CancellationToken): Promise<ErrorAnalysis> {
        const reports: vscode.Uri[] = await this.getFailureTestReports();
        return stack.includes('Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin') && reports.length > 0 ? await this.analyzeTestReports(reports, token) : await this.analyzeErrorStack(stack, token);
    }

    async analyzeErrorStack(stack: string, token: vscode.CancellationToken): Promise<ErrorAnalysis> {
        const request = {
            error: stack,
            dependencies: await this.getDependencies(),
            files: this.files
        };
        const messages = [
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, RESOLVE_ERROR_SYSTEM_MESSAGE),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, JSON.stringify(request)),
        ];
        for (let i = 0; i < AI_RETRY_TIMES; i++) {
            try {
                const response = await (await this.getLanaugageModel()).sendRequest(messages, {}, token);
                const responseContent = await getResponseContent(response);
                return JSON.parse(responseContent) as ErrorAnalysis;
            } catch (ignore: any) {
                continue;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return {
            stack: stack
        };
    }

    // current: will fix one test case at a time
    // need investigate whether we can fix all test cases at once
    async analyzeTestReports(reports: vscode.Uri[], token: vscode.CancellationToken): Promise<ErrorAnalysis> {
        const uri = reports[0];
        const content = await vscode.workspace.fs.readFile(uri).then(array => new TextDecoder().decode(array));
        const fileName = path.basename(uri.fsPath, ".txt");
        const testCase = (await vscode.workspace.findFiles('**/*Tests.java', '**/{node_modules,build,target,bin}/**'))
            .find(uri => uri.fsPath.includes(fileName.replace(/\./g, "/")));
        const testContent = testCase ? await vscode.workspace.fs.readFile(testCase).then(array => new TextDecoder().decode(array)) : '';
        const request = {
            report: content,
            testcase: testContent,
        };
        const messages = [
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, ANALYZE_TEST_ERROR_SYSTEM_MESSAGE),
            new vscode.LanguageModelChatMessage(LanguageModelChatMessageRole.User, JSON.stringify(request)),
        ];
        for (let i = 0; i < AI_RETRY_TIMES; i++) {
            try {
                const response = await (await this.getLanaugageModel()).sendRequest(messages, {}, token);
                const responseContent = await getResponseContent(response);
                const result = JSON.parse(responseContent) as ErrorAnalysis;
                return {
                    ...result,
                    stack: content
                };
            } catch (ignore: any) {
                continue;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return {
            stack: content
        }
    }

    async getFailureTestReports(): Promise<vscode.Uri[]> {
        const reports = await vscode.workspace.findFiles('**/surefire-reports/*.txt', '**/{node_modules,build,bin}/**');
        const filterPromise = reports.map(async path => {
            const content = await vscode.workspace.fs.readFile(path);
            return new TextDecoder().decode(content).split('\n').length > 5 ? path : null;
        });
        const filteredReports = (await Promise.all(filterPromise)).filter(report => report !== null) as vscode.Uri[];
        return filteredReports;
    }

    public getRemainRecipesCount(): number {
        return this.recipes.filter(r => r?.complete).length;
    }

    public async runAllRecipes(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        // prepare recipe tasks
        this.phase = MigratePhase.Resolve;
        this.sumaryCurrentStatus(stream);
        this.tasks = [...this.recipes].reverse().filter(r => !r?.complete).map(r => new RunRecipeTask(r));
        this.tasks = [new RunRecipesSummaryTask(this.recipes), ...this.tasks];
        return this.executeTasks(stream, token);
    }

    public async runNextRecipe(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        this.phase = MigratePhase.Resolve;
        this.sumaryCurrentStatus(stream);

        const recipe = [...this.recipes].reverse().find(r => !r?.complete);
        this.tasks = recipe ? [new RunRecipeTask(recipe)] : [];
        return this.executeTasks(stream, token);
    }

    public async validateProject(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        this.phase = MigratePhase.Verify;
        this.sumaryCurrentStatus(stream);
        this.tasks = [new ValidationTask()];
        return this.executeTasks(stream, token);
    }

    public async resolveIssues(solution: ErrorAnalysis | undefined, stack: string | undefined, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        if (!solution) {
            return this.retry(stream, token);
        }
        this.sumaryCurrentStatus(stream);
        const solutions = await this.convertSolutionToTask(solution, stack);
        this.tasks = [...this.tasks, ...solutions.reverse()];
        return this.executeTasks(stream, token);
    }

    async convertSolutionToTask(analysis: ErrorAnalysis, stack: string | undefined): Promise<MigrationTask[]> {
        const solution = analysis.solution;
        if (solution?.kind === 'recipes') {
            const recipeSolution = solution as RecipeSolution;
            return recipeSolution.recipes.map(r => new RunRecipeTask(r));
        } else if (solution?.kind === 'command') {
            const commandSolution = solution as CommandSolution;
            return commandSolution.commands.map(r => new CommandTask(r));
        } else if (solution?.kind === 'dependency') {
            const dependencySolution = solution as DependencySolution;
            return dependencySolution.dependencies.map(r => new DependencyTask(r));
        } else if (solution?.kind === 'code') {
            return [new CodeTask(stack ?? '', analysis, this)];
        }
        return [];
    }

    async readBuildFile(): Promise<string> {
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const fullPath = path.join(rootPath, "pom.xml"); // todo get the build file from ai
        const uri = vscode.Uri.file(fullPath);
        const array = await vscode.workspace.fs.readFile(uri);
        const content = new TextDecoder().decode(array);
        let result = content.replace(/<profiles>[\s\S]*?<\/profiles>/, '');
        result = result.replace(/<build>[\s\S]*?<\/build>/, '');
        result = result.replace(/<repositories>[\s\S]*?<\/repositories>/, '');
        result = result.replace(/<pluginRepositories>[\s\S]*?<\/pluginRepositories>/, '');
        result = result.replace(/<licenses>[\s\S]*?<\/licenses>/, '');
        return result;
    }

    public async retry(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrationTaskResult> {
        this.sumaryCurrentStatus(stream);
        return this.executeTasks(stream, token);
    }

    public isRecipesAllResolved(): boolean {
        return this.recipes.find(r => !r.complete) === undefined;
    }
}

export function getErrorStacksFromOutput(output: string): string {
    return output.split('\n').filter(line => line.includes('[ERROR]')).map(s => s.trim()).join('\n');
}
