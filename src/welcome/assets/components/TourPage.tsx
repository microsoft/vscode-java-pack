// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
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
            label: l10n.t("Open Project Folder"),
            description: <div>{richText(l10n.t("{0} containing your Java project for full features."), [<a href={openFolderCommand}>{l10n.t("Open a folder")}</a>])}</div>,
            imageUri: require("../resources/open-project.png")
        }, {
            title: "Project Explorer",
            label: l10n.t("Project Explorer"),
            description: <div>{richText(l10n.t("Expand {0} to view your project structure."), [<a href={showProjectExplorerCommand}>{l10n.t("Java Project Explorer")}</a>])}</div>,
            imageUri: require("../resources/project-manager.png")
        }, {
            title: "Running and Debugging",
            label: l10n.t("Running and Debugging"),
            description: <div>{richText(l10n.t("Open {0} to start your project."), [<a href={showRunAndDebugViewCommand}>{l10n.t("Run and Debug View")}</a>])}</div>,
            imageUri: require("../resources/debugger.png")
        }, {
            title: "Testing",
            label: l10n.t("Testing"),
            description: <div>{richText(l10n.t("Use {0} to run unit tests."), [<a href={showTestExplorerViewCommand}>{l10n.t("Testing View")}</a>])}</div>,
            imageUri: require("../resources/testing.png")
        }];
    }, []);

    const nextStep = () => setStep(s => s + 1);

    const steps = useMemo(() => {
        const startingPage = <div key="start">
            <img src={logoIcon} alt={l10n.t("logo")} className="logo" />
            <h2>{l10n.t("Welcome to use Java Tools")}</h2>
            <div>{l10n.t("lightweight, performant, powerful.")}</div>
            <div><button className="btn" onClick={nextStep}>{l10n.t("Get Started")}</button></div>
            <div><a href="#" onClick={() => skipTourFrom("Starting Page")}>{l10n.t("skip")}</a></div>
        </div>;

        const pages = contentPages.map(elem => <div className="text-center" key={elem.title}>
            <h2>{elem.label}</h2>
            <div>{elem.description}</div>
            <img src={elem.imageUri} alt={elem.label} className="screenshot" />
            <button className="btn" onClick={nextStep}>{l10n.t("Next Step")}</button>
            <div><a href="#" onClick={() => skipTourFrom(elem.title)}>{l10n.t("skip")}</a></div>
        </div>);

        const endingPage = <div key="end">
            <img src={doneIcon} alt={l10n.t("logo")} className="logo" />
            <h2>{l10n.t("You're good to go!")}</h2>
            <div>{l10n.t("Next, start using Java!")}</div>
            <div><button className="btn" onClick={nextStep}>{l10n.t("What's next?")}</button></div>
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
        return <div>{l10n.t("Loading...")}</div>;
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
