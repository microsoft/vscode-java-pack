// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode"; 
import { getExpService } from "../exp";
import { TreatmentVariables } from "../exp/TreatmentVariables";

export function isWalkthroughEnabled() {

    const fromExp = getExpService().getTreatmentVariable<boolean>(TreatmentVariables.VSCodeConfig, TreatmentVariables.JavaWalkthroughEnabled);
    // 	can be overridden by local settings "experiments.override.gettingStarted.overrideCategory.vscjava.vscode-java-pack#javaWelcome.when": "true"
    const fromSettings = workspace.getConfiguration("experiments.override.gettingStarted.overrideCategory").get<string>("vscjava.vscode-java-pack#javaWelcome.when") === "true";

    return fromExp || fromSettings;
}