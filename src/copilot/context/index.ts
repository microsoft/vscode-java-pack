// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { logger } from "../logger";
import { isInTreatmentGroup, sendEvent } from "../utils";
import { TreatmentVariables } from "../../exp/TreatmentVariables";
import { JavaContextProvider } from "./JavaContextProvider";

export async function activateLmTools(context: vscode.ExtensionContext): Promise<void> {
    if (!vscode?.lm?.registerTool) {
        sendEvent("java.copilot.lmTools.versionNotSupported");
        return;
    }
    const enableChatVariable = await isInTreatmentGroup(TreatmentVariables.JavaCopilotEnableContextVariable);
    if (!enableChatVariable) {
        return;
    }

    context.subscriptions.push(vscode.lm.registerTool("vscodeJavaContextTool", new JavaContextProvider()));
    logger.info('LM Tool "vscodeJavaContextTool" registered.');
}
