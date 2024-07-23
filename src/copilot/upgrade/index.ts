import * as vscode from 'vscode';
import { handleChatRequest, PARTICIPANT_NAME, provideFollowups } from './chat';

export function activateChatProviders(context: vscode.ExtensionContext): void {
    const agent = vscode.chat.createChatParticipant(PARTICIPANT_NAME, handleChatRequest);
    // cat.iconPath = vscode.Uri.joinPath(context.extensionUri, 'cat.jpeg');
    agent.followupProvider = { provideFollowups };
    context.subscriptions.push(agent);
}
