import { LanguageModelChatMessage, LanguageModelChatUserMessage, LanguageModelChatAssistantMessage, lm, Disposable, CancellationToken, LanguageModelChatRequestOptions } from "vscode";
import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { logger } from "./utils";

export default class Copilot {
    public static readonly DEFAULT_END_MARK = '<|endofresponse|>';
    public static readonly DEFAULT_MAX_ROUNDS = 10;
    public static readonly DEFAULT_MODEL = 'copilot-gpt-4';
    public static readonly DEFAULT_MODEL_OPTIONS: LanguageModelChatRequestOptions = { modelOptions: {} };
    public static readonly NOT_CANCELLABEL: CancellationToken = { isCancellationRequested: false, onCancellationRequested: () => Disposable.from() };

    public constructor(
        private readonly model: string = Copilot.DEFAULT_MODEL,
        private readonly modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        private readonly maxRounds: number = Copilot.DEFAULT_MAX_ROUNDS,
        private readonly endMark: string = Copilot.DEFAULT_END_MARK
    ) {
    }

    private async doSend(
        systemMessagesOrSamples: LanguageModelChatMessage[],
        userMessage: string,
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        let answer: string = '';
        let rounds: number = 0;
        const messages = [...systemMessagesOrSamples];
        const _send = async (message: string): Promise<boolean> => {
            rounds++;
            logger.info(`User: \n`, message);
            messages.push(new LanguageModelChatUserMessage(message));
            logger.info('Copilot: thinking...');

            let rawAnswer: string = '';
            try {
                const response = await lm.sendChatRequest(this.model, messages, modelOptions ?? this.modelOptions, cancellationToken);
                for await (const item of response.stream) {
                    rawAnswer += item;
                }
            } catch (e) {
                logger.error(`Failed to send request to copilot`, e);
                throw new Error(`Failed to send request to copilot: ${e}`);
            }
            messages.push(new LanguageModelChatAssistantMessage(rawAnswer));
            logger.info(`Copilot: \n`, rawAnswer);
            answer += rawAnswer;
            return answer.trim().endsWith(this.endMark);
        };
        let complete: boolean = await _send(userMessage);
        while (!complete && rounds < this.maxRounds) {
            complete = await _send('continue where you left off.');
        }
        logger.debug('rounds', rounds);
        sendInfo('java.copilot.sendRequest.info', { rounds: rounds });
        return answer.replace(this.endMark, "");
    }

    public async send(
        systemMessagesOrSamples: LanguageModelChatMessage[],
        userMessage: string,
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        return instrumentSimpleOperation("java.copilot.sendRequest", this.doSend.bind(this))(systemMessagesOrSamples, userMessage, modelOptions, cancellationToken);
    }
}
