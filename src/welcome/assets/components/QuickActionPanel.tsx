// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { encodeCommandUriWithTelemetry, supportedByNavigator } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";

export default function QuickActionPanel() {
    const newProjectElement = <span>
        {"Create a "}
        <span className="highlight">{"New Project"}</span>
    </span>;
    const existingProjectElement = <span>
        {"Open an "}
        <span className="highlight">{"Existing Project"}</span>
    </span>;
    const tourElement = <span>
        {"Take a "}
        <span className="highlight">{"Tour"}</span>
    </span>;
    const actions: any[] = [
        { name: "Create a New Project", command: "java.project.create", element: newProjectElement },
        { name: "Open an Existing Project", command: "workbench.action.files.openFolder", os: "win", element: existingProjectElement },
        { name: "Open an Existing Project", command: "workbench.action.files.openFolder", os: "linux", element: existingProjectElement },
        { name: "Open an Existing Project", command: "workbench.action.files.openFileFolder", os: "mac", element: existingProjectElement },
        { name: "Take a Tour", command: "workbench.action.openWalkthrough", args: ["vscjava.vscode-java-pack#javaWelcome"], element: tourElement }
    ];
    const actionItems = actions.filter(action => !action.os || supportedByNavigator(action.os)).map(action => (
        <a
            className="list-group-item list-group-item-action"
            href={encodeCommandUriWithTelemetry(WEBVIEW_ID, action.name, action.command, action.args)}
            key={action.name}
        >{action.element}</a>
    ));
    return (
        <div className="quick-actions">
            <h5>Get Started</h5>
            <div className="list-group">
                {actionItems}
            </div>
        </div>
    );
}
