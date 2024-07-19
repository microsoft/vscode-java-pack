import { JavaProject, JavaProjectContext } from "./JavaProject";
import * as vscode from "vscode";
import { logger } from "../logger";
import { fixedInstrumentSimpleOperation, sendEvent } from "../utils";

export async function activateChatVariable(context: vscode.ExtensionContext): Promise<void> {
    const subscription = vscode.chat.registerChatVariableResolver("context_for_java", "context_for_java", "Context info of current Java Project", "Java Context", false, {
        async resolve(_name: string, _context: vscode.ChatVariableContext, _token: vscode.CancellationToken): Promise<vscode.ChatVariableValue[]> {
            return fixedInstrumentSimpleOperation("java.copilot.context.resolve", async (_name: string, _context: vscode.ChatVariableContext, _token: vscode.CancellationToken) => {
                sendEvent("java.copilot.context.resolving", {
                    variableName: _name,
                });
                logger.info(`Resolving chat variable "context_for_java"...`);
                const document = vscode.window.activeTextEditor?.document ?? vscode.workspace.textDocuments[0];
                const project = await JavaProject.ofDocument(document!);
                let context: JavaProjectContext | undefined = await project.collectContext({
                    layout: false
                });
                const contextStr: string = JavaProjectContext.toString(context);
                logger.info(`Resolved chat variable "context_for_java"`);
                logger.debug(`Context: \n${contextStr}`);
                sendEvent("java.copilot.context.resolved", {
                    variableName: _name,
                    appType: context?.appType,
                    hosts: context?.hosts,
                    javaVersion: context?.javaVersion,
                    dependencies: context?.dependencies?.length,
                    buildTools: context?.buildTools,
                });
                return [{ level: vscode.ChatVariableLevel.Full, value: contextStr, description: '' }];
            })(_name, _context, _token);
        }
    });
    context.subscriptions.push(subscription);
    logger.info('Chat variable "context_for_java" registered.');
    sendEvent("java.copilot.context.activated", {});
}
