// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import Header from "./Header";
import NavigationPanel from "./NavigationPanel";
import QuickActionPanel from "./QuickActionPanel";
import SocialMediaPanel from "./SocialMediaPanel";

export class GetStartedPage extends React.Component {
    
    render() {
        return (
            <div>
                <Header />
                <QuickActionPanel />
                <NavigationPanel />
                <SocialMediaPanel />
            </div>
        );
    }
}
