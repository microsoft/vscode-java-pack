// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// based on https://github.com/redhat-developer/vscode-java/blob/fcbe9204638610ce773cedaef445f19032a785cb/src/requirements.ts

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { env } from "vscode";

const expandHomeDir = require("expand-home-dir");
const REQUIRED_JDK_VERSION = 11;
import { findJavaHomes, getJavaVersion, JavaRuntime } from "./findJavaRuntime";


const isWindows = process.platform.indexOf("win") === 0;
const JAVAC_FILENAME = "javac" + (isWindows ? ".exe" : "");

export async function resolveRequirements(): Promise<any> {
    return new Promise(async (resolve, reject) => {
        let source: string;
        let javaVersion: number = 0;
        let javaHome = await checkJavaPreferences();
        if (javaHome) {
            // java.home explictly specified
            source = `java.home variable defined in ${env.appName} settings`;
            javaHome = expandHomeDir(javaHome) as string;
            if (!await fse.pathExists(javaHome)) {
                invalidJavaHome(reject, `The ${source} points to a missing or inaccessible folder (${javaHome})`);
            } else if (!await fse.pathExists(path.resolve(javaHome, "bin", JAVAC_FILENAME))) {
                let msg: string;
                if (await fse.pathExists(path.resolve(javaHome, JAVAC_FILENAME))) {
                    msg = `'bin' should be removed from the ${source} (${javaHome})`;
                } else {
                    msg = `The ${source} (${javaHome}) does not point to a JDK.`;
                }
                invalidJavaHome(reject, msg);
            }
            javaVersion = await getJavaVersion(javaHome);
        } else {
            // java.home not specified, search valid JDKs from env.JAVA_HOME, env.PATH, Registry(Window), Common directories
            const javaRuntimes = await findJavaHomes();
            const validJdks = javaRuntimes.filter(r => r.version >= REQUIRED_JDK_VERSION);
            if (validJdks.length > 0) {
                sortJdksBySource(validJdks);
                javaHome = validJdks[0].home;
                javaVersion = validJdks[0].version;
            }
        }

        if (javaVersion < REQUIRED_JDK_VERSION) {
            let message = `Java ${REQUIRED_JDK_VERSION} or more recent is required to run the Java extension.`;
            if (javaHome) {
                message += `(Current JDK: ${javaHome})`;
            }
            invalidJavaHome(reject, message);
        }

        resolve({ java_home: javaHome, java_version: javaVersion });
    });
}

function sortJdksBySource(jdks: JavaRuntime[]) {
    const rankedJdks = jdks as Array<JavaRuntime & { rank: number }>;
    const sources = ["env.JDK_HOME", "env.JAVA_HOME", "env.PATH"];
    for (const [index, source] of sources.entries()) {
        for (const jdk of rankedJdks) {
            if (jdk.rank === undefined && jdk.sources.includes(source)) {
                jdk.rank = index;
            }
        }
    }
    rankedJdks.filter(jdk => jdk.rank === undefined).forEach(jdk => jdk.rank = sources.length);
    rankedJdks.sort((a, b) => a.rank - b.rank);
}

function checkJavaPreferences(){
    return vscode.workspace.getConfiguration("java").get<string>("home");
}

function invalidJavaHome(reject: any, reason: string) {
    reject(new Error(reason));
}
