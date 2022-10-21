// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { createHash } from "crypto";

const TAGS: string[] = [
    "buildship",
    "m2e",
    "gradle",
    "maven",
    "bundle"
];

const MESSAGE_WHITELIST: string[] = [
    "Application error",
    "BadLocationException",
    "Could not load Gradle version information",
    "Error computing hover",
    "Error in calling delegate command handler",
    "Error in JDT Core during AST creation",
    "Error occurred while deleting",
    "Error filtering index locations based on qualifier.",
    "Failed to configure project",
    "Failed to publish diagnostics for",
    "Failed to detect project changes",
    "Failed to update qualified index.",
    "Failed to launch debuggee in terminal. Reason: java.util.concurrent.TimeoutException: timeout",
    "Failed to save JDT index",
    "failed to send diagnostics",
    "FrameworkEvent ERROR",
    "Initialization failed",
    "Index out of bounds",
    "JavaBuilder handling CoreException",
    "Offset > length",
    "Problems occurred when invoking code from plug-in: \"org.eclipse.jdt.ls.core\".",
    "Problems occurred when invoking code from plug-in: \"org.eclipse.core.resources\".",
    "Problems occurred when invoking code from plug-in: \"org.eclipse.jdt.core.manipulation\".",
    "Problem resolving refactor code actions",
    "Problem with folding range",
    "Problem with codeComplete for",
    "Synchronize Gradle projects with workspace failed due to an error connecting to the Gradle build.",
    "Synchronize Gradle projects with workspace failed due to an error in the referenced Gradle build.",
    "Unable to read JavaModelManager nonChainingJarsCache file",
    "Workspace restored, but some problems occurred.",

    // While loading class "xxxx", thread "Thread[Worker-1: Loading available Gradle versions,5,main]" timed out waiting (300xxms) for thread "Thread[Worker-0: Synchronizing projects,5,main]" to finish starting bundle "org.eclipse.buildship.core_3.1.6.v20220511-1359 [16]". To avoid deadlock, thread "Thread[Worker-1: Loading available Gradle versions,5,main]" is proceeding but "xxxx" may not be fully initialized.
    // xxxx stands for below:
    // org.eclipse.buildship.core.internal.preferences.PersistentModelConverter
    // org.eclipse.buildship.core.internal.util.gradle.PublishedGradleVersions$LookupStrategy
    // ...
    "While loading class \"org.eclipse.buildship.core.internal." 
];

export function redact(rawMessage: string, consentToCollectLogs: boolean): {
    message: string;
    tags: string[];
    hash: string;
} {
    const matchedMessage = MESSAGE_WHITELIST.find(msg => rawMessage.includes(msg));
    const message = matchedMessage ?? (consentToCollectLogs ? rawMessage : "");
    const hash = sha1(matchedMessage ?? rawMessage);
    const tags = TAGS.filter(tag => rawMessage.toLocaleLowerCase().includes(tag));

    return {
        message,
        tags,
        hash
    }
}

function sha1(content: string): string {
    const hash = createHash("sha1");
    hash.update(content);
    return hash.digest('hex');
}