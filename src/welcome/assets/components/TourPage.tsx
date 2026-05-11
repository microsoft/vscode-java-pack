// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { useState, useEffect, useRef, useMemo } from "react";
import { encodeCommandUriWithTelemetry, supportedByNavigator } from "../../../utils/webview";
import { onWillFetchInitProps, reportSkipTour, WEBVIEW_ID } from "../utils";

const logoIcon = require("../../../../logo.svg");
const doneIcon = require("../resources/done.svg");

export default function TourPage() {
    const [step, setStep] = useState(0);
    const timerRef = useRef<number | undefined>(undefined);

    const contentPages = useMemo(() => {
        const openFolderCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "open folder", supportedByNavigator("mac") ? "workbench.action.files.openFileFolder" : "workbench.action.files.openFolder");
        const showProjectExplorerCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "show project explorer", "javaProjectExplorer.focus");
        const showRunAndDebugViewCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "show run and debug view", "workbench.view.debug");
        const showTestExplorerViewCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "show test explorer", "testExplorer.focus");

        return [{
            title: "Open Project Folder",
            description: <div><a href={openFolderCommand}>Open a folder</a> containing your Java project for full features.</div>,
            imageUri: require("../resources/open-project.png")
        }, {
            title: "Project Explorer",
            description: <div>Expand <a href={showProjectExplorerCommand}>Java Project Explorer</a> to view your project structure.</div>,
            imageUri: require("../resources/project-manager.png")
        }, {
            title: "Running and Debugging",
            description: <div>Open <a href={showRunAndDebugViewCommand}>Run and Debug View</a> to start your project.</div>,
            imageUri: require("../resources/debugger.png")
        }, {
            title: "Testing",
            description: <div>Use <a href={showTestExplorerViewCommand}>Testing View</a> to run unit tests.</div>,
            imageUri: require("../resources/testing.png")
        }];
    }, []);

    const nextStep = () => setStep(s => s + 1);

    const steps = useMemo(() => {
        const startingPage = <div key="start">
            <img src={logoIcon} alt="logo" className="logo" />
            <h2>Welcome to use Java Tools</h2>
            <div>lightweight, performant, powerful.</div>
            <div><button className="btn" onClick={nextStep}>Get Started</button></div>
            <div><a href="#" onClick={() => skipTourFrom("Starting Page")}>skip</a></div>
        </div>;

        const pages = contentPages.map(elem => <div className="text-center" key={elem.title}>
            <h2>{elem.title}</h2>
            <div>{elem.description}</div>
            <img src={elem.imageUri} alt={elem.title} className="screenshot" />
            <button className="btn" onClick={nextStep}>Next Step</button>
            <div><a href="#" onClick={() => skipTourFrom(elem.title)}>skip</a></div>
        </div>);

        const endingPage = <div key="end">
            <img src={doneIcon} alt="logo" className="logo" />
            <h2>You're good to go!</h2>
            <div>Next, start using Java!</div>
            <div><button className="btn" onClick={nextStep}>What's next?</button></div>
        </div>;

        return [startingPage, ...pages, endingPage];
    }, [contentPages]);

    useEffect(() => {
        if (timerRef.current !== undefined) {
            clearTimeout(timerRef.current);
        }

        if (step >= steps.length) {
            onWillFetchInitProps();
        } else if (step === steps.length - 1) {
            timerRef.current = window.setTimeout(() => {
                onWillFetchInitProps();
            }, 5000);
        }

        return () => {
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
            }
        };
    }, [step, steps.length]);

    if (step >= steps.length) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container-fluid root">
            <div className="row mb-4 mt-5">
                <div className="col text-center page-content">
                    {steps[step]}
                </div>
            </div>
            <div className="row mb-4 footer">
                <div className="col">
                    <div className="page-indicator text-center">
                        {steps.map((_elem, index) =>
                            <span key={index} className={index === step ? "active dot" : "dot"} onClick={() => setStep(index)}></span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function skipTourFrom(page: string) {
    reportSkipTour(page);
    onWillFetchInitProps();
}
