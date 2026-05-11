// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-tabs/index.js";
import "@vscode-elements/elements/dist/vscode-tab-header/index.js";
import "@vscode-elements/elements/dist/vscode-tab-panel/index.js";


import { WEBVIEW_ID } from '../../constants';
import { encodeExternalLinkWithTelemetry } from '../../../utils/webview';
import { onWillReloadWindow } from '../vscode.api';
import AdoptiumJDKPanel from './components/AdoptiumJDKPanel';
import OtherJDKsPanel from './components/OtherJDKsPanel';

export default function InstallJDKView() {
    const helpLink = "https://github.com/redhat-developer/vscode-java#setting-the-jdk";
    return (
        <div className="install-jdk-view">
            <header className="header">
                <h1 className="title">Install New JDK</h1>
            </header>
            <p className="intro">{/*reserved for introduction*/}</p>
            <vscode-tabs selected-index={0} >
                <vscode-tab-header slot="header" id="tab-1">Adoptium's Temurin</vscode-tab-header>
                <vscode-tab-header slot="header" id="tab-2">Others</vscode-tab-header>
                <vscode-tab-panel id="view-1">
                    <AdoptiumJDKPanel />
                </vscode-tab-panel>
                <vscode-tab-panel id="view-2">
                    <OtherJDKsPanel />
                </vscode-tab-panel>
            </vscode-tabs>
            <div className="footer">
                <p>After you finish JDK installation, please reload Visual Studio Code to make it effective.</p>
                <div>
                    <vscode-button secondary onClick={onWillReloadWindow}>Reload Window</vscode-button>
                    <a className='troubleshoot-link' href={encodeExternalLinkWithTelemetry(WEBVIEW_ID, "Having trouble?", helpLink)}>Having trouble?</a>
                </div>

            </div>
        </div>
    );
}
