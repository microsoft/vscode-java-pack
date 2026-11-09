// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]!));
}

export function webviewLanguage(): string {
    return escapeHtml(vscode.env.language);
}

export function formatHtml(message: string, trustedFragments: readonly string[]): string {
    return escapeHtml(message).replace(/\{(\d+)\}/g, (_match, index: string) => {
        const fragment = trustedFragments[Number(index)];
        if (fragment === undefined) {
            throw new Error(`Unknown localized HTML placeholder: ${index}`);
        }
        return fragment;
    });
}

export function localizationBootstrap(nonce: string): string {
    // Keep catalog text inert, including HTML/script delimiters and JS line separators.
    const data = JSON.stringify({ language: vscode.env.language, bundle: vscode.l10n.bundle ?? {} })
        .replace(/[<>&\u2028\u2029]/g, character => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
    return `<script id="java-pack-l10n" type="application/json" nonce="${escapeHtml(nonce)}">${data}</script>`;
}
