// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { compareVersions } from "compare-versions";
import * as path from "path";
import * as vscode from "vscode";
import { ToolingRuntimeInfo } from "../types";

const expandHomeDir = require("expand-home-dir");

export interface RequirementsData {
    tooling_jre: string | undefined;  // Used to launch Java extension.
    tooling_jre_version: number;
    java_home: string | undefined; // Used as default project JDK.
    java_version: number;
}

export function getRequiredJdkVersion(): number {
    const javaExt = vscode.extensions.getExtension("redhat.java");
    // Installation guidance uses the current release's minimum when the extension is absent.
    if (!javaExt || compareVersions(javaExt.packageJSON.version, "1.57.0") >= 0) {
        return 25;
    }
    if (compareVersions(javaExt.packageJSON.version, "1.39.0") >= 0) {
        return 21;
    }
    return 17;
}

export function getToolingRuntimeInfo(): ToolingRuntimeInfo {
    const requiredJdkVersion = getRequiredJdkVersion();
    const info: ToolingRuntimeInfo = { requiredJdkVersion };
    const javaExt = vscode.extensions.getExtension<{ javaRequirement?: RequirementsData; status?: string }>("redhat.java");
    if (!javaExt) {
        info.javaHomeWarning = "Language Support for Java (redhat.java) is unavailable. Check that it is installed and enabled.";
        return info;
    }
    const api = javaExt.isActive ? javaExt.exports : undefined;
    if (api?.status === "Error") {
        info.javaHomeError = "redhat.java reports an error. Open the Java logs for details.";
    }
    const requirements = api?.javaRequirement;
    if (!requirements) {
        return info;
    }
    info.javaDotHome = requirements.tooling_jre;
    info.toolingJreVersion = requirements.tooling_jre_version;
    if (requirements.tooling_jre && requirements.tooling_jre_version < requiredJdkVersion) {
        info.javaHomeWarning = `The runtime reported by redhat.java uses Java ${requirements.tooling_jre_version}, below the required Java ${requiredJdkVersion}. Open the Java logs for details.`;
    }

    const configuredHome = vscode.workspace.getConfiguration().get<string>("java.jdt.ls.java.home");
    if (configuredHome && requirements.tooling_jre && !sameHome(expandHomeDir(configuredHome), requirements.tooling_jre)) {
        // Use the version reported by redhat.java, not another local runtime probe.
        const configuredVersion = sameHome(expandHomeDir(configuredHome), requirements.java_home)
            ? requirements.java_version : undefined;
        const configurationWarning = configuredVersion && configuredVersion < requiredJdkVersion
            ? `The configured 'java.jdt.ls.java.home' uses Java ${configuredVersion}, below the required Java ${requiredJdkVersion}. redhat.java reports a different language-server runtime.`
            : "The configured 'java.jdt.ls.java.home' differs from the runtime reported by redhat.java. Open the Java logs for details.";
        info.javaHomeWarning = [info.javaHomeWarning, configurationWarning].filter(Boolean).join(" ");
    }
    return info;
}

function sameHome(left: string, right?: string): boolean {
    if (!right) {
        return false;
    }
    const normalize = (home: string) => process.platform === "win32"
        ? path.resolve(home).toLowerCase() : path.resolve(home);
    return normalize(left) === normalize(right);
}
