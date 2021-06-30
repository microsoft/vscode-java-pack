// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export class CodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(_document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const classPathDiagnostics: vscode.Diagnostic[] = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === "Java" && diagnostic.code === "32") {
                classPathDiagnostics.push(diagnostic);
            }
        }

        if (classPathDiagnostics.length === 0) {
            return [];
        }

        const codeAction: vscode.CodeAction = new vscode.CodeAction("Configure classpath");
        codeAction.diagnostics = classPathDiagnostics;
        codeAction.command = {
            title: "Configure classpath",
            command: "java.classpathConfiguration"
        };
        codeAction.kind = vscode.CodeActionKind.QuickFix;
        return [codeAction];
    }
}
