// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode"; 
import { getExpService } from "../exp";
import { TreatmentVariables } from "../exp/TreatmentVariables";

// local cache before EXP starts, otherwise it always returns undefined, and keeps querying service.
let enabledByExp: boolean;

export async function isWalkthroughEnabled() {
    // can be overridden by local settings "experiments.override.gettingStarted.overrideCategory.vscjava.vscode-java-pack.javaWelcome.when": "true"
    // '#' -> '.' since https://github.com/microsoft/vscode/commit/fe671f300845ca5161885125b1e12d43fc25ccf8
    const fromSettings: string | undefined = workspace.getConfiguration("experiments.override.gettingStarted.overrideCategory").get<string>("vscjava.vscode-java-pack.javaWelcome.when");
    switch (fromSettings) {
        case "true":
            return true;
        case "false":
            return false;
        default:
    }

    if (enabledByExp === undefined) {
        const flightValue = await getExpService()?.getTreatmentVariableAsync<string>(TreatmentVariables.VSCodeConfig, TreatmentVariables.JavaWalkthroughEnabled, true /* checkCache */);
        enabledByExp = (flightValue === "true");
    }
    return enabledByExp;
}
