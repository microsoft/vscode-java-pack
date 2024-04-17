/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Disposable, LanguageModelChatAssistantMessage, LanguageModelChatMessage, LanguageModelChatSystemMessage, LanguageModelChatUserMessage, lm } from 'vscode';
import { addContextProperty, instrumentSimpleOperation } from 'vscode-extension-telemetry-wrapper';
import { output } from './output';

export const END_MARK = "<|endofresponse|>";
async function _sendRequest(systemMessages: { role: string, content: string }[], instruction: string): Promise<string> {
    const messages: LanguageModelChatMessage[] = systemMessages.map(message => {
        switch (message.role) {
            case 'system':
                return new LanguageModelChatSystemMessage(message.content);
            case 'user':
                return new LanguageModelChatUserMessage(message.content);
            default:
                return new LanguageModelChatAssistantMessage(message.content);
        }
    })
    let answer: string = '';
    let rounds: number = 0;
    const doSendRequest = async (message: string): Promise<boolean> => {
        rounds++;
        output.warn(`User:`);
        output.log(message);
        messages.push(new LanguageModelChatUserMessage(message));
        output.warn(`Assistant:`);
        output.log('thinking...');

        let rawAnswer: string = '';
        try {
            const response = await lm.sendChatRequest('copilot-gpt-4', messages, { modelOptions: {} }, { isCancellationRequested: false, onCancellationRequested: () => Disposable.from() });
            for await (const item of response.stream) {
                rawAnswer += item;
            }
        } catch (e) {
            output.error(`Failed to send request to copilot: ${e}`);
            throw new Error(`Failed to send request to copilot: ${e}`);
        }
        messages.push(new LanguageModelChatAssistantMessage(rawAnswer));
        output.warn(`Assistant:`);
        output.log(rawAnswer);
        answer += rawAnswer;
        return !answer.trim().endsWith(END_MARK);
    };
    let isPartial: boolean = await doSendRequest(instruction);
    while (isPartial && rounds < 10) {
        isPartial = await doSendRequest('continue where you left off.');
    }
    addContextProperty('rounds', rounds + '');
    return answer.replace(END_MARK, "");
}

export async function sendRequest(systemMessages: { role: string, content: string }[], instruction: string): Promise<string> {
    return instrumentSimpleOperation("java.copilot.sendRequest", _sendRequest)(systemMessages, instruction);
}

// @ts-ignore unused method
function extractCodeBlock(markdownText: string): string {
    const regex = /```(?:Java|java)?([\s\S]*?)```/g;
    const codeBlocks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdownText)) !== null) {
        codeBlocks.push(match?.[1]?.trim());
    }
    const codeBlock = codeBlocks[0] ?? markdownText;
    // return codeBlock.replace(/^(?:\s*\n)+/, '');
    // remove the starting and ending blank lines (including those with whitespaces)
    return codeBlock.replace(/^[ \t]*\n/gm, '').replace(/\n[ \t]*$/gm, '');
}
