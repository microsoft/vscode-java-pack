import { LanguageModelChatMessage, lm, Disposable, CancellationToken, LanguageModelChatRequestOptions, LanguageModelChatSelector } from "vscode";
import { fixedInstrumentSimpleOperation, logger, sendEvent } from "./utils";

export default class Copilot {
    public static readonly DEFAULT_END_MARK = '<|endofresponse|>';
    public static readonly DEFAULT_MAX_ROUNDS = 3;
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
        newMessages: LanguageModelChatMessage[],
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        sendEvent("java.copilot.lm.chatStarted");
        const model = (await lm.selectChatModels(this.modelSelector))?.[0];
        if (!model) {
            const models = await lm.selectChatModels();
            sendEvent("java.copilot.lm.noSuitableModelFound", { models: models.map(m => m.name).join(', ') });
            throw new Error(`No suitable model, available models: [${models.map(m => m.name).join(', ')}]. Please make sure you have installed the latest "GitHub Copilot Chat" (v0.16.0 or later).`);
        }
        sendEvent("java.copilot.lm.modelSelected", { model: model.name });

        let answer: string = '';
        let rounds: number = 0;
        const history = [...this.systemMessagesOrSamples];
        const _send = async (userMessages: LanguageModelChatMessage[]): Promise<boolean> => {
            rounds++;
            history.push(...userMessages);
            history.forEach(message => {
                logger.debug(`${message.name}: \n`, message.content);
            });
            logger.info(`User: ${userMessages[userMessages.length - 1].content.split('\n')[0]}...`);
            logger.info('Copilot: thinking...');

            let rawAnswer: string = '';
            try {
                sendEvent("java.copilot.lm.requestSent");
                const response = await model.sendRequest(history, modelOptions ?? this.modelOptions, cancellationToken);
                for await (const item of response.text) {
                    rawAnswer += item;
                }
            } catch (e) {
                //@ts-ignore
                const cause = e.cause || e;
                sendEvent("java.copilot.lm.requestFailed", { error: cause });
                logger.error(`Failed to chat with copilot`, cause);
                throw cause;
            }
            history.push(LanguageModelChatMessage.Assistant(rawAnswer));
            logger.debug(`Copilot: \n`, rawAnswer);
            logger.info(`Copilot: ${rawAnswer.trim().split('\n')[0]}...`);
            answer += rawAnswer;
            return answer.trim().endsWith(this.endMark);
        };
        let complete: boolean = await _send(newMessages);
        while (!complete && rounds < this.maxRounds) {
            complete = await _send([LanguageModelChatMessage.User(`continue where you left off, or end your response with "${this.endMark}" to finish the conversation.`)]);
        }
        logger.debug('rounds', rounds);
        sendEvent("java.copilot.lm.chatCompleted", { rounds: rounds });
        return answer.replace(`//${this.endMark}`, '').replace(this.endMark, '');
    }

    public async send(
        newMessages: LanguageModelChatMessage[],
        modelOptions: LanguageModelChatRequestOptions = Copilot.DEFAULT_MODEL_OPTIONS,
        cancellationToken: CancellationToken = Copilot.NOT_CANCELLABEL
    ): Promise<string> {
        return fixedInstrumentSimpleOperation("java.copilot.sendRequest", this.doSend.bind(this))(newMessages, modelOptions, cancellationToken);
    }
}
