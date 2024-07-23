
import * as vscode from 'vscode';
import { ChatResponseTurn, ChatResult } from 'vscode';
import { MigrateChatResult, MigratePhase, MigrationTaskResult } from './constants';
import { MigrationJob } from './migrate';

export const PARTICIPANT_NAME: string = 'GitHubCopilotforJava';
export const MIGRATE_COMMAND_ID: string = 'upgrade';
export const LANGUAGE_MODEL_ID = 'gpt-4';

// upgrade prompts
const RUN_ALL_RECIPES = 'run all recipes';
const RUN_RECIPES_ONE_BY_ONE = 'run recipes one by one';
const RESOLVE_ISSUES_AUTO = 'resolve issues';
const RESOLVED_ISSUES_MANUAL = 'issues resolved manually, continue';
const VALIATE_PROJECT = 'validate project';
const SUMMARY = 'summary';
const SYSTEM_PROMPTS = [RUN_ALL_RECIPES, RUN_RECIPES_ONE_BY_ONE, RESOLVE_ISSUES_AUTO, RESOLVED_ISSUES_MANUAL, VALIATE_PROJECT, SUMMARY];
// follow up actions
const RUN_ALL_RECIPES_FOLLOW_UP: vscode.ChatFollowup = {
    prompt: RUN_ALL_RECIPES,
    label: vscode.l10n.t('Run all recipes'),
    command: MIGRATE_COMMAND_ID
};
const RUN_RECIPES_ONE_BY_ONE_FOLLOW_UP: vscode.ChatFollowup = {
    prompt: RUN_RECIPES_ONE_BY_ONE,
    label: vscode.l10n.t('Run recipes one by one'),
    command: MIGRATE_COMMAND_ID
};
const VALIATE_PROJECT_FOLLOW_UP: vscode.ChatFollowup = {
    prompt: VALIATE_PROJECT,
    label: vscode.l10n.t('Validate project'),
    command: MIGRATE_COMMAND_ID
};
const RESOLVE_ISSUES_AUTO_FOLLOW_UP: vscode.ChatFollowup = {
    prompt: RESOLVE_ISSUES_AUTO,
    label: vscode.l10n.t('Resolve issues'),
    command: MIGRATE_COMMAND_ID
};
const RESOLVED_ISSUES_MANUAL_FOLLOW_UP: vscode.ChatFollowup = {
    prompt: RESOLVED_ISSUES_MANUAL,
    label: vscode.l10n.t('Issues resolved manually, continue'),
    command: MIGRATE_COMMAND_ID
};

export const Jobs: MigrationJob[] = [];

export async function handleChatRequest(request: vscode.ChatRequest, _context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<MigrateChatResult> {
    if (request.command === MIGRATE_COMMAND_ID) {
        const prompt = request.prompt;
        const lastAgentMessage: ChatResponseTurn = _context.history.filter(message =>
            message instanceof ChatResponseTurn && message.participant === PARTICIPANT_NAME).pop() as ChatResponseTurn;
        const result = lastAgentMessage?.result as MigrateChatResult;
        const job = result?.metadata?.migration ? getMigrationJob(result.metadata?.migration) : undefined;
        if (SYSTEM_PROMPTS.includes(prompt)) {
            if (result === null || job === undefined) {
                stream.markdown('Could not find upgrade task from context, please run `upgrade` command first. \n');
                return {
                    errorDetails: {
                        message: 'Could not find upgrade task from context, please run `upgrade` command first.'
                    }
                }
            }
            let taskResult: MigrationTaskResult | undefined = undefined;
            if (prompt === RUN_ALL_RECIPES) {
                taskResult = await job?.runAllRecipes(stream, token);
            } else if (prompt === RUN_RECIPES_ONE_BY_ONE) {
                taskResult = await job?.runNextRecipe(stream, token);
            } else if (prompt === VALIATE_PROJECT) {
                taskResult = await job?.validateProject(stream, token);
            } else if (prompt === RESOLVE_ISSUES_AUTO) {
                // logic to get the error message
                const stack = result.metadata?.result?.errorStack;
                const errorAnalysis = result.metadata?.result?.errorAnalysis;
                taskResult = await job?.resolveIssues(errorAnalysis, stack, stream, token);
            } else if (prompt === RESOLVED_ISSUES_MANUAL) {
                taskResult = await job?.retry(stream, token);
            } else {
                stream.markdown(`Unsupported system command for upgrade ${prompt} \n`);
                return {
                    errorDetails: {
                        message: `Unsupported system command for upgrade ${prompt}`
                    }
                }
            }
            return {
                metadata: {
                    migration: job.id,
                    result: taskResult
                }
            }
        } else {
            stream.progress('Gathering workspace information...');
            // const buildFile = await getBuildFile(token);
            const job = new MigrationJob(prompt === '' ? 'Migrate to Java 17' : prompt);
            Jobs.push(job);
            const initResult = await job.initialize(stream, token);
            return {
                metadata: {
                    migration: job.id,
                    result: initResult
                }
            }
        }

    }
    // for non upgrade command, send prompt to open ai
    return Promise.reject();
}

function getMigrationJob(id: string): MigrationJob | undefined {
    return Jobs.find(m => m.id === id);
}

export function provideFollowups(result: ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken): vscode.ChatFollowup[] {
    // for migration, provide
    const migration = result.metadata?.['migration'] as MigrationJob;
    if (migration === undefined) {
        return [];
    }
    const migrateResult = result as MigrateChatResult;
    const migrationJob = getMigrationJob(migrateResult.metadata?.migration ?? '');
    const commandResult = migrateResult.metadata?.result;
    const phase = migrationJob?.phase;
    const remainRecipes = migrationJob ? migrationJob.recipes.filter(r => !r?.complete).length : 0;
    if (phase === MigratePhase.Initialize) {
        if (commandResult?.success) {
            return remainRecipes > 1 ? [RUN_ALL_RECIPES_FOLLOW_UP, RUN_RECIPES_ONE_BY_ONE_FOLLOW_UP] : [RUN_ALL_RECIPES_FOLLOW_UP];
        } else {
            return [];
        }
    } else if (phase === MigratePhase.Resolve) {
        if (commandResult?.success) {
            return remainRecipes === 0 ? [VALIATE_PROJECT_FOLLOW_UP] :
                remainRecipes > 1 ? [RUN_ALL_RECIPES_FOLLOW_UP, RUN_RECIPES_ONE_BY_ONE_FOLLOW_UP] : [RUN_ALL_RECIPES_FOLLOW_UP];
        } else {
            return [RESOLVE_ISSUES_AUTO_FOLLOW_UP, RESOLVED_ISSUES_MANUAL_FOLLOW_UP];
        }
    } else if (phase === MigratePhase.Verify) {
        if (commandResult?.success) {
            return []; // todo: return summary
        } else {
            return [RESOLVE_ISSUES_AUTO_FOLLOW_UP, RESOLVED_ISSUES_MANUAL_FOLLOW_UP];
        }
    } else {
        return [];
    }
}

