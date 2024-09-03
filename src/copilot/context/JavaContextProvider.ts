// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { JavaProject, JavaProjectContext } from "./JavaProject";
import * as vscode from "vscode";
import { logger } from "../logger";
import { fixedInstrumentSimpleOperation, sendEvent } from "../utils";
import { JavaProjectContextResult } from "./results/JavaProjectContextResult";
import { EmptyContextResult } from "./results/EmptyContextResult";

export class JavaContextProvider implements vscode.LanguageModelTool {
    invoke(_options: vscode.LanguageModelToolInvocationOptions, _token: vscode.CancellationToken): Thenable<vscode.LanguageModelToolResult> {
        return fixedInstrumentSimpleOperation("java.copilot.vscodeJavaContextTool.invoke", async () => {
            logger.info(`Invoking LM Tool "vscodeJavaContextTool"...`);
            const document = vscode.window.activeTextEditor?.document ?? vscode.workspace.textDocuments[0];
            const project = await JavaProject.ofDocument(document);
            if (!project) {
                logger.info(`No Java project found.`);
                sendEvent("java.copilot.vscodeJavaContextTool.noProjectFound", {});
                return new EmptyContextResult();
            }
            let context: JavaProjectContext | undefined = await project.collectContext({
                layout: false
            });
            const result = new JavaProjectContextResult(context);
            logger.info(`Invoked LM Tool "vscodeJavaContextTool"`);
            logger.debug(`Context: \n${result.toString()}`);
            sendEvent("java.copilot.vscodeJavaContextTool.resolved", {
                appType: context?.appType,
                hosts: context?.hosts,
                javaVersion: context?.javaVersion,
                dependencies: context?.dependencies?.length,
                buildTools: context?.buildTools,
            });
            return result;
        })(_options, _token);
    }
}
