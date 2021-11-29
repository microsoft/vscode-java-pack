// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import * as webviewUI from "@vscode/webview-ui-toolkit";
import React from 'react';
import { WEBVIEW_ID } from '../../constants';
import { encodeExternalLinkWithTelemetry } from '../../../utils/webview';
import { onWillReloadWindow } from '../vscode.api';
import AdoptiumJDKPanel from './components/AdoptiumJDKPanel';
import OtherJDKsPanel from './components/OtherJDKsPanel';

const { wrap } = provideReactWrapper(React);


const PanelTab = wrap(webviewUI.VSCodePanelTab);
const Panels = wrap(webviewUI.VSCodePanels);
const PanelView = wrap(webviewUI.VSCodePanelView);
const Button = wrap(webviewUI.VSCodeButton);
const Link = wrap(webviewUI.VSCodeLink);

export default function InstallJDKView() {
    const helpLink = "https://github.com/redhat-developer/vscode-java#setting-the-jdk";
    return (
        <div className="install-jdk-view">
            <header className="header">
                <h1 className="title">Install New JDK</h1>
            </header>
            <p className="intro">{/*reserved for introduction*/}</p>
            <Panels activeid="tab-1">
                <PanelTab id="tab-1">Adoptium's Temurin</PanelTab>
                <PanelTab id="tab-2">Others</PanelTab>
                <PanelView id="view-1">
                    <AdoptiumJDKPanel />
                </PanelView>
                <PanelView id="view-2">
                    <OtherJDKsPanel />
                </PanelView>
            </Panels>
            <div className="footer">
                <p>After you finish JDK installation, please reload Visual Studio Code to make it effective.</p>
                <div>
                    <Button appearance='secondary' onClick={onWillReloadWindow}>Reload Window</Button>
                    <Link className='troubleshoot-link' href={encodeExternalLinkWithTelemetry(WEBVIEW_ID, "Having trouble?", helpLink)}>Having trouble?</Link>
                </div>

            </div>
        </div>
    );
}
