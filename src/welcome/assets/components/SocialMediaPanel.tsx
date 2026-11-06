// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";

export default function SocialMediaPanel() {
    const links = [
        { name: "Documentation", label: l10n.t("Documentation"), command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-tutorial"], iconClass: "codicon codicon-book" },
        { name: "Questions & Issues", label: l10n.t("Questions & Issues"), command: "java.helper.openUrl", args: ["https://github.com/microsoft/vscode-java-pack/issues"], iconClass: "codicon codicon-github-inverted" },
    ];
    const elements = links.map(link => (
        <a
          href={encodeCommandUriWithTelemetry(WEBVIEW_ID, link.name, link.command, link.args)}
          key={link.name}
        ><i className={link.iconClass} style={{width: "1.2em", height: "1.2em"}}></i> {link.label}</a>
    ));
    return (
        <div className="list-group">
            {elements}
        </div>
    );
}
