// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { VSCodeLink, VSCodeButton, VSCodePanelView, VSCodePanels, VSCodePanelTab } from "@vscode/webview-ui-toolkit/react";
import React from 'react';
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
            <VSCodePanels activeid="tab-1">
                <VSCodePanelTab id="tab-1">Adoptium's Temurin</VSCodePanelTab>
                <VSCodePanelTab id="tab-2">Others</VSCodePanelTab>
                <VSCodePanelView id="view-1">
                    <AdoptiumJDKPanel />
                </VSCodePanelView>
                <VSCodePanelView id="view-2">
                    <OtherJDKsPanel />
                </VSCodePanelView>
            </VSCodePanels>
            <div className="footer">
                <p>After you finish JDK installation, please reload Visual Studio Code to make it effective.</p>
                <div>
                    <VSCodeButton appearance='secondary' onClick={onWillReloadWindow}>Reload Window</VSCodeButton>
                    <VSCodeLink className='troubleshoot-link' href={encodeExternalLinkWithTelemetry(WEBVIEW_ID, "Having trouble?", helpLink)}>Having trouble?</VSCodeLink>
                </div>

            </div>
        </div>
    );
}
