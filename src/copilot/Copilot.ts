import { LanguageModelChatMessage, lm, Disposable, CancellationToken, LanguageModelChatRequestOptions, LanguageModelChatMessageRole, LanguageModelChatSelector } from "vscode";
import { fixedInstrumentSimpleOperation, logger } from "./utils";
import { sendInfo } from "vscode-extension-telemetry-wrapper";

export default class Copilot {
    public static readonly DEFAULT_END_MARK = '<|endofresponse|>';
    public static readonly DEFAULT_MAX_ROUNDS = 10;
    public static readonly DEFAULT_MODEL = { family: 'gpt-4' };
    public static readonly DEFAULT_MODEL_OPTIONS: LanguageModelChatRequestOptions = { modelOptions: {} };
    public static readonly NOT_CANCELLABEL: CancellationToken = { isCancellationRequested: false, onCancellationRequested: () => Disposable.from() };

    public constructor(
        private readonly systemMessagesOrSamples: LanguageModelChatMessage[],
        private readonly modelSelector: LanguageModelChatSelector = Copilot.DEFAULT_MODEL,
        private readonly modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        private readonly maxRounds: number = Copilot.DEFAULT_MAX_ROUNDS,
        private readonly endMark: string = Copilot.DEFAULT_END_MARK
    ) {
    }

    private async doSend(
        userMessage: string,
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        let answer: string = '';
        let rounds: number = 0;
        const messages = [...this.systemMessagesOrSamples];
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
                    const models = await lm.selectChatModels();
                    throw new Error(`No suitable model, available models: [${models.map(m => m.name).join(', ')}]. Please make sure you have installed the latest "GitHub Copilot Chat" (v0.16.0 or later).`);
                }
                const response = await model.sendRequest(messages, modelOptions ?? this.modelOptions, cancellationToken);
                for await (const item of response.text) {
                    rawAnswer += item;
                }
            } catch (e) {
                //@ts-ignore
                const cause = e.cause || e;
                logger.error(`Failed to chat with copilot`, cause);
                throw cause;
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
        userMessage: string,
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        return fixedInstrumentSimpleOperation("java.copilot.sendRequest", this.doSend.bind(this))(userMessage, modelOptions, cancellationToken);
    }
}
