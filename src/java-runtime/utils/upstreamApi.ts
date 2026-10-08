// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// based on https://github.com/redhat-developer/vscode-java/blob/4e49f187a903b8c7b1ed7277a3b2535691fd59f3/src/requirements.ts

import { compareVersions } from "compare-versions";
import * as fse from "fs-extra";
import { findRuntimes, getRuntime, getSources, IJavaRuntime, JAVAC_FILENAME, JAVA_FILENAME } from 'jdk-utils';
import * as path from "path";
import * as vscode from "vscode";
import { env, workspace } from 'vscode';

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

export async function resolveRequirements(): Promise<RequirementsData> {
    const javaExt = vscode.extensions.getExtension<{ javaRequirement?: RequirementsData }>("redhat.java");
    if (!javaExt) {
        throw new Error("The required extension 'redhat.java' is not installed.");
    }
    const requiredJdkVersion = getRequiredJdkVersion();
    const requirements = javaExt.isActive ? javaExt.exports?.javaRequirement : undefined;
    if (requirements) {
        if (!requirements.tooling_jre || requirements.tooling_jre_version < requiredJdkVersion) {
            throw new Error(getJdkRequirementError(requiredJdkVersion));
        }
        return requirements;
    }

    const javaExtPath = javaExt.extensionPath;
    let toolingJre: string | undefined = await findEmbeddedJRE(javaExtPath);
    let toolingJreVersion: number = await getMajorVersion(toolingJre);
    if (toolingJreVersion < requiredJdkVersion) {
        toolingJre = undefined;
        toolingJreVersion = 0;
    }

    const javaPreferences = checkJavaPreferences();
    const preferenceName = javaPreferences.preference;
    let javaVersion = 0;
    let javaHome = javaPreferences.javaHome;
    if (javaHome) {
        const source = `${preferenceName} variable defined in ${env.appName} settings`;
        javaHome = expandHomeDir(javaHome);
        if (!await fse.pathExists(javaHome!)) {
            throw new Error(`The ${source} points to a missing or inaccessible folder (${javaHome})`);
        } else if (!await fse.pathExists(path.resolve(javaHome!, 'bin', JAVAC_FILENAME))) {
            if (await fse.pathExists(path.resolve(javaHome!, JAVAC_FILENAME))) {
                throw new Error(`'bin' should be removed from the ${source} (${javaHome})`);
            }
            throw new Error(`The ${source} (${javaHome}) does not point to a JDK.`);
        }
        javaVersion = await getMajorVersion(javaHome);
        if (preferenceName === "java.jdt.ls.java.home" || !toolingJre) {
            if (javaVersion >= requiredJdkVersion) {
                toolingJre = javaHome;
                toolingJreVersion = javaVersion;
            } else {
                console.warn(`The Java runtime set by '${preferenceName}' does not meet the minimum required version of '${requiredJdkVersion}' and will not be used to launch the Java Language Server.`);
            }
        }
    }

    if (!toolingJre) {
        const javaRuntimes = await findRuntimes({checkJavac: true, withVersion: true, withTags: true});
        const validJdks: IJavaRuntime[] = [];
        for (const runtime of javaRuntimes) {
            if (runtime.version && runtime.version.major >= requiredJdkVersion &&
                (await fse.pathExists(path.join(runtime.homedir, "lib", "rt.jar")) ||
                 await fse.pathExists(path.join(runtime.homedir, "jre", "lib", "rt.jar")) ||
                 await fse.pathExists(path.join(runtime.homedir, "lib", "jrt-fs.jar")))) {
                validJdks.push(runtime);
            }
        }
        sortJdksByVersion(validJdks);
        sortJdksBySource(validJdks);
        if (validJdks.length > 0) {
            toolingJre = validJdks[0].homedir;
            toolingJreVersion = validJdks[0].version?.major ?? 0;
            if (!javaHome) {
                javaHome = toolingJre;
                javaVersion = toolingJreVersion;
            }
        }
    } else if (!javaHome) {
        javaHome = await findDefaultRuntimeFromSettings();
        if (javaHome) {
            javaVersion = await getMajorVersion(javaHome);
        } else {
            javaHome = toolingJre;
            javaVersion = toolingJreVersion;
        }
    }

    if (!toolingJre || toolingJreVersion < requiredJdkVersion) {
        throw new Error(getJdkRequirementError(requiredJdkVersion));
    }

    return {
        tooling_jre: toolingJre,
        tooling_jre_version: toolingJreVersion,
        java_home: javaHome,
        java_version: javaVersion,
    };
}

async function findEmbeddedJRE(javaExtPath?: string): Promise<string | undefined> {
    if (!javaExtPath) {
        return undefined;
    }
    const jreHome = path.join(javaExtPath, "jre");
    if (fse.existsSync(jreHome) && fse.statSync(jreHome).isDirectory()) {
        const candidates = fse.readdirSync(jreHome);
        for (const candidate of candidates) {
            if (fse.existsSync(path.join(jreHome, candidate, "bin", JAVA_FILENAME))) {
                return path.join(jreHome, candidate);
            }
        }
    }

    return;
}

async function findDefaultRuntimeFromSettings(): Promise<string | undefined> {
    const runtimes = workspace.getConfiguration().get("java.configuration.runtimes");
    if (Array.isArray(runtimes) && runtimes.length) {
        let candidate: string | undefined;
        for (const runtime of runtimes) {
            if (!runtime || typeof runtime !== 'object' || !runtime.path) {
                continue;
            }

            const jr = await getRuntime(runtime.path);
            if (jr) {
                candidate = jr.homedir;
            }

            if (runtime.default) {
                break;
            }
        }

        return candidate;
    }

    return undefined;
}

function sortJdksBySource(jdks: IJavaRuntime[]) {
    const sources = ["JDK_HOME", "JAVA_HOME", "PATH"];
    const jdkManagers = ["SDKMAN", "jEnv", "jabba", "asdf"];
    const rank = (jdk: IJavaRuntime) => {
        const detectedSources = getSources(jdk);
        const sourceIndex = sources.findIndex(source => detectedSources.includes(source));
        if (sourceIndex >= 0) {
            return sourceIndex;
        }
        if (detectedSources.some(source => jdkManagers.includes(source))) {
            return sources.length + 1;
        }
        return detectedSources.length === 0 ? sources.length + 2 : sources.length + 3;
    };
    jdks.sort((a, b) => rank(a) - rank(b));
}

/**
 * Sort by major version in descend order.
 */
function sortJdksByVersion(jdks: IJavaRuntime[]) {
    jdks.sort((a, b) => (b.version?.major ?? 0) - (a.version?.major ?? 0));
}


function checkJavaPreferences(){
    let preference: string = 'java.jdt.ls.java.home';
    let javaHome = workspace.getConfiguration().get<string>('java.jdt.ls.java.home');
    if (!javaHome) { // Read java.home from the deprecated "java.home" setting.
        preference = 'java.home';
        javaHome = workspace.getConfiguration().get<string>('java.home');
    }
    return {
        javaHome,
		preference
	};
}

function getJdkRequirementError(requiredJdkVersion: number): string {
    return `Java ${requiredJdkVersion} or more recent is required to run the Java extension. Please download and install a recent JDK. You can still compile your projects with older JDKs by configuring ['java.configuration.runtimes'](https://github.com/redhat-developer/vscode-java/wiki/JDK-Requirements#java.configuration.runtimes)`;
}

async function getMajorVersion(javaHome?: string): Promise<number> {
    if (!javaHome) {
        return 0;
    }
    const runtime = await getRuntime(javaHome, { withVersion: true });
    return runtime?.version?.major || 0;
}