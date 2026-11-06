// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";
import { ProjectType } from "../utils/webview";

export function projectTypeLabel(projectType: ProjectType): string {
    switch (projectType) {
        case ProjectType.Default: return l10n.t("Default project");
        case ProjectType.UnmanagedFolder: return l10n.t("Unmanaged folder");
        case ProjectType.Maven: return l10n.t("Maven");
        case ProjectType.Gradle: return l10n.t("Gradle");
        case ProjectType.Others: return l10n.t("Others");
    }
}
