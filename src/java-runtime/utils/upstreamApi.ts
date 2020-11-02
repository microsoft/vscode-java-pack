// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// based on https://github.com/redhat-developer/vscode-java/blob/fcbe9204638610ce773cedaef445f19032a785cb/src/requirements.ts

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { env } from "vscode";

const expandHomeDir = require("expand-home-dir");
import findJavaHome = require("find-java-home");


const isWindows = process.platform.indexOf("win") === 0;
const JAVAC_FILENAME = "javac" + (isWindows ? ".exe" : "");

export async function checkJavaRuntime(): Promise<string> {
    return new Promise(async (resolve, reject) => {
        let source: string;
        let javaHome = await checkJavaPreferences();
        if (javaHome) {
            source = `java.home variable defined in ${env.appName} settings`;
        } else {
            javaHome = process.env["JDK_HOME"];
            if (javaHome) {
                source = "JDK_HOME environment variable";
            } else {
                javaHome = process.env["JAVA_HOME"];
                source = "JAVA_HOME environment variable";
            }
        }
        if (javaHome) {
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
            return resolve(javaHome);
        }
        // No settings, let's try to detect as last resort.
        findJavaHome((err, home) => {
            if (err) {
                invalidJavaHome(reject, "Java runtime (JDK, not JRE) could not be located");
            }
            else {
                resolve(home);
            }
        });
    });
}


function checkJavaPreferences(){
    return vscode.workspace.getConfiguration("java").get<string>("home");
}

function invalidJavaHome(reject: any, reason: string) {
    reject(new Error(reason));
}
