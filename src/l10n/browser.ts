// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";

interface LocalizationData {
    language: string;
    bundle: { [key: string]: string };
}

export function initializeLocalization(): void {
    const element = document.getElementById("java-pack-l10n");
    if (!element) {
        l10n.config({ contents: {} });
        return;
    }
    const data: LocalizationData = JSON.parse(element.textContent || "");
    if (!data || typeof data.language !== "string" || !data.bundle || typeof data.bundle !== "object" || Array.isArray(data.bundle) ||
        Object.values(data.bundle).some(value => typeof value !== "string")) {
        throw new Error("Invalid Java Pack localization bootstrap.");
    }
    l10n.config({ contents: data.bundle });
    document.documentElement.lang = data.language;
}

initializeLocalization();
