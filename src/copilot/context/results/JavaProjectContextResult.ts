// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dependency, JavaProjectContext } from "../JavaProject";
import * as vscode from "vscode";

export class JavaProjectContextResult implements vscode.LanguageModelToolResult {
    constructor(private context: JavaProjectContext) { }

    toString(): string {
        let contextStr = "This is a Java project of the following natures:\n";
        if (this.context.javaVersion) {
            contextStr += ` - Using Java ${this.context.javaVersion}. I would prefer solutions using the new and more recent features introduced in Java ${this.context.javaVersion}.\n`;
        }
        if ((this.context.buildTools?.length ?? 0) > 0) {
            contextStr += ` - Using ${this.context.buildTools?.join(",")} as build tools.\n`;
        }
        if ((this.context.dependencies?.length ?? 0) > 0) {
            contextStr += ` - Declared dependencies: \n`;
            this.context.dependencies?.forEach(dep => contextStr += `   - ${Dependency.dependecyToString(dep)}\n`);
            contextStr += `   (I would prefer solutions provided by these dependency libs. Don't ask me to add these already declared dependencies)\n`;
        }
        if (this.context.layout) {
            contextStr +=
                ` - this is the layout of the project files structure:
                    \`\`\`plaintext
                    ${this.context.layout}
                    \`\`\`            
                `;
        }
        if (this.context.appType) {
            contextStr += ` - It's a ${this.context.appType} project.\n`;
        }
        if (this.context.host) {
            contextStr += ` - Will be deployed on ${this.context.host}.\n`;
        }
        return contextStr;
    }
}
