// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export class EmptyContextResult implements vscode.LanguageModelToolResult {
    toString(): string {
        return "";
    }
}
