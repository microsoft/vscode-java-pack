// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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
];

export function redact(rawMessage: string): string {
    const matchedMessage = MESSAGE_WHITELIST.find(msg => rawMessage.includes(msg));
    if (matchedMessage) {
        return matchedMessage;
    } else {
        const lower = rawMessage.toLocaleLowerCase();
        const tags = TAGS.filter(tag => lower.includes(tag));
        return tags.length > 0 ? `Tags:${tags.join(",")}` : "";
    }
}