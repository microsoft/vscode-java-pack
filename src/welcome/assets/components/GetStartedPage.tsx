// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import ControllerPanel from "./ControllerPanel";
import Header from "./Header";
import NavigationPanel from "./NavigationPanel";
import QuickActionPanel from "./QuickActionPanel";
import SocialMediaPanel from "./SocialMediaPanel";

interface GetStartedPageProps {
    showWhenUsingJava: boolean;
    firstTimeRun: boolean;
    isAwtDisabled: boolean;
}

export function GetStartedPage({ showWhenUsingJava, isAwtDisabled }: GetStartedPageProps) {
    return (
        <div className="container-fluid root">
            <div className="row mb-4">
                <div className="col">
                    <Header />
                </div>
            </div>
            <div className="row mb-4">
                <div className="col">
                    <QuickActionPanel />
                </div>
            </div>
            <div className="row mb-4">
                <div className="col">
                    <NavigationPanel isAwtDisabled={isAwtDisabled} />
                </div>
            </div>
            <div className="row mb-4 footer">
                <div className="col">
                    <div className="row mb-2">
                        <div className="col">
                            <SocialMediaPanel />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col">
                            <ControllerPanel showWhenUsingJava={showWhenUsingJava} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
