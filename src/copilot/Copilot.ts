import { LanguageModelChatMessage, lm, Disposable, CancellationToken, LanguageModelChatRequestOptions, LanguageModelChatMessageRole, LanguageModelChatSelector } from "vscode";
import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { logger } from "./utils";

export default class Copilot {
    public static readonly DEFAULT_END_MARK = '<|endofresponse|>';
    public static readonly DEFAULT_MAX_ROUNDS = 10;
    public static readonly DEFAULT_MODEL = { family: 'gpt-4' };
    public static readonly DEFAULT_MODEL_OPTIONS: LanguageModelChatRequestOptions = { modelOptions: {} };
    public static readonly NOT_CANCELLABEL: CancellationToken = { isCancellationRequested: false, onCancellationRequested: () => Disposable.from() };

    public constructor(
        private readonly modelSelector: LanguageModelChatSelector = Copilot.DEFAULT_MODEL,
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
            logger.debug(`User: \n`, message);
            logger.info(`User: ${message.split('\n')[0]}...`);
            messages.push(new LanguageModelChatMessage(LanguageModelChatMessageRole.User, message));
            logger.info('Copilot: thinking...');

            let rawAnswer: string = '';
            try {
                const model = (await lm.selectChatModels(this.modelSelector))?.[0];
                if (!model) {
                    throw new Error('No model selected');
                }
                const response = await model.sendRequest(messages, modelOptions ?? this.modelOptions, cancellationToken);
                for await (const item of response.text) {
                    rawAnswer += item;
                }
            } catch (e) {
                logger.error(`Failed to send request to copilot`, e);
                throw new Error(`Failed to send request to copilot: ${e}`);
            }
            messages.push(new LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, rawAnswer));
            logger.debug(`Copilot: \n`, rawAnswer);
            logger.info(`Copilot: ${rawAnswer.split('\n')[0]}...`);
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
