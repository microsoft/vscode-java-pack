import * as child_process from "child_process";
import * as vscode from "vscode";
import { LanguageModelChatResponse } from "vscode";

// async function getBuildFile(token: vscode.CancellationToken): Promise<string> {
//     const files: string[] = (await vscode.workspace.findFiles('**/*', '**/{node_modules,build,target,bin}/**'))
//         .map(file => vscode.workspace.asRelativePath(file));
//     const buildFileMessages = [
//         new vscode.LanguageModelChatSystemMessage(FIND_BUILD_FILE_SYSTEM_MESSAGE),
//         new vscode.LanguageModelChatUserMessage(FIND_BUILD_FILE_EXAMPLE_USER_INPUT_NORMAL),
//         new vscode.LanguageModelChatAssistantMessage(FIND_BUILD_FILE_EXAMPLE_RESPONSE_NORMAL),
//         new vscode.LanguageModelChatUserMessage(FIND_BUILD_FILE_EXAMPLE_USER_INPUT_INVALID),
//         new vscode.LanguageModelChatAssistantMessage(FIND_BUILD_FILE_EXAMPLE_RESPONSE_INVLIAD),
//         new vscode.LanguageModelChatUserMessage(JSON.stringify(files))
//     ];
//     const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, buildFileMessages, {}, token);
//     return getResponseContent(chatResponse);
// }

export async function getResponseContent(chatResponse: LanguageModelChatResponse) {
    let result = '';
    for await (const item of chatResponse.text) {
        result += item;
    }
    return result;
}

export async function executeCommandAndGetResponse(command: string): Promise<{ isSuccess: boolean; output: string; }> {
    return new Promise((resolve) => {
        child_process.exec(command, { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '' }, (error, stdout, stderr) => {
            resolve({ isSuccess: error === null, output: error !== null && stderr?.length !== 0 ? stderr : stdout });
        });
    });
}
