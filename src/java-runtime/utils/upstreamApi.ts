// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { compareVersions } from "compare-versions";
import * as fse from "fs-extra";
import { findRuntimes, getRuntime, IJavaRuntime, JAVA_FILENAME } from 'jdk-utils';
import * as path from "path";
import * as vscode from "vscode";
import { JavaRuntimeEntry, ToolingRuntimeInfo } from "../types";

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

export async function getToolingRuntimeInfo(discoveredRuntimes?: IJavaRuntime[]): Promise<ToolingRuntimeInfo> {
    const requiredJdkVersion = getRequiredJdkVersion();
    const info: ToolingRuntimeInfo = { requiredJdkVersion, toolingRuntimes: [] };
    const javaExt = vscode.extensions.getExtension<{ javaRequirement?: RequirementsData }>("redhat.java");
    if (!javaExt) {
        info.javaHomeError = "The required extension 'redhat.java' is not installed.";
        return info;
    }
    applyReportedRuntime(info);
    const preferences = vscode.workspace.getConfiguration();
    const toolingHome = preferences.get<string>("java.jdt.ls.java.home");
    const preferenceName = toolingHome ? "java.jdt.ls.java.home" : "java.home";
    const configuredHome = toolingHome || preferences.get<string>("java.home");
    let configuredRuntime: IJavaRuntime | undefined;
    if (configuredHome) {
        try {
            configuredRuntime = await getRuntime(expandHomeDir(configuredHome), {checkJavac: true, withVersion: true});
        } catch (error) {
            console.warn(error);
            const message = error instanceof Error ? error.message : String(error);
            info.javaHomeWarning = `Unable to inspect the configured '${preferenceName}' (${configuredHome}): ${message}. Java Pack has not changed this setting.`;
        }
    }
    if (!info.javaHomeWarning && configuredHome && !configuredRuntime?.hasJavac) {
        info.javaHomeWarning = `The configured '${preferenceName}' (${configuredHome}) does not point to a valid JDK. Java Pack has not changed this setting.`;
    } else if (toolingHome && configuredRuntime && (configuredRuntime.version?.major ?? 0) < requiredJdkVersion) {
        info.javaHomeWarning = `The configured '${preferenceName}' uses Java ${configuredRuntime.version?.major ?? 0}, below the required Java ${requiredJdkVersion}. It cannot launch the language server. Runtime selection is controlled by redhat.java; project JDKs can still be older.`;
    }

    if (applyReportedRuntime(info)) {
        return info;
    }

    const candidates = new Map<string, JavaRuntimeEntry>();
    const addCandidate = (runtime: IJavaRuntime, type: string) => {
        if (runtime.version && runtime.version.major >= requiredJdkVersion && !candidates.has(runtime.homedir)) {
            candidates.set(runtime.homedir, {
                name: runtime.homedir,
                fspath: runtime.homedir,
                majorVersion: runtime.version.major,
                type
            });
        }
    };
    if (configuredRuntime?.hasJavac) {
        addCandidate(configuredRuntime, preferenceName);
    }

    const jreHome = path.join(javaExt.extensionPath, "jre");
    if (fse.existsSync(jreHome) && fse.statSync(jreHome).isDirectory()) {
        for (const candidate of fse.readdirSync(jreHome)) {
            const home = path.join(jreHome, candidate);
            if (fse.existsSync(path.join(home, "bin", JAVA_FILENAME))) {
                const runtime = await getRuntime(home, {withVersion: true});
                if (runtime) {
                    addCandidate(runtime, "Bundled runtime");
                }
            }
        }
    }
    const runtimes = discoveredRuntimes ?? await findRuntimes({checkJavac: true, withVersion: true});
    for (const runtime of runtimes) {
        if (runtime.hasJavac && runtime.version && runtime.version.major >= requiredJdkVersion &&
            (await fse.pathExists(path.join(runtime.homedir, "lib", "rt.jar")) ||
             await fse.pathExists(path.join(runtime.homedir, "jre", "lib", "rt.jar")) ||
             await fse.pathExists(path.join(runtime.homedir, "lib", "jrt-fs.jar")))) {
            addCandidate(runtime, "Discovered JDK");
        }
    }
    // Activation may finish while candidate inspection is in progress.
    if (applyReportedRuntime(info)) {
        return info;
    }
    info.toolingRuntimes = [...candidates.values()];
    if (info.toolingRuntimes.length === 0) {
        info.javaHomeError = getJdkRequirementError(requiredJdkVersion);
    }
    return info;
}

function applyReportedRuntime(info: ToolingRuntimeInfo): boolean {
    const javaExt = vscode.extensions.getExtension<{ javaRequirement?: RequirementsData }>("redhat.java");
    const requirements = javaExt?.isActive ? javaExt.exports?.javaRequirement : undefined;
    if (!requirements) {
        return false;
    }
    info.javaDotHome = requirements.tooling_jre;
    info.toolingJreVersion = requirements.tooling_jre_version;
    info.toolingRuntimes = [];
    info.javaHomeError = !requirements.tooling_jre || requirements.tooling_jre_version < info.requiredJdkVersion
        ? getJdkRequirementError(info.requiredJdkVersion)
        : undefined;
    return true;
}

function getJdkRequirementError(requiredJdkVersion: number): string {
    return `Java ${requiredJdkVersion} or more recent is required to run the Java extension. Please download and install a recent JDK. You can still compile your projects with older JDKs by configuring ['java.configuration.runtimes'](https://github.com/redhat-developer/vscode-java/wiki/JDK-Requirements#java.configuration.runtimes)`;
}
