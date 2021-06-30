// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

// See: https://github.com/eclipse/eclipse.jdt.ls/blob/f0b68a8251b4971cac58eddc731227b66493ffc9/org.eclipse.jdt.ls.core/src/org/eclipse/jdt/ls/core/internal/handlers/BaseDiagnosticsHandler.java#L48
const NOT_ON_CLASSPATH: string = "32";
export class CodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(_document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const classPathDiagnostics: vscode.Diagnostic[] = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === "Java" && diagnostic.code === NOT_ON_CLASSPATH) {
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
