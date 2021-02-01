// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Col, Container, Row } from "react-bootstrap";
import ControllerPanel from "./ControllerPanel";
import Header from "./Header";
import NavigationPanel from "./NavigationPanel";
import QuickActionPanel from "./QuickActionPanel";
import SocialMediaPanel from "./SocialMediaPanel";
import TourPage from "./TourPage";

export class GetStartedPage extends React.Component<{
    showWhenUsingJava: boolean,
    firstTimeRun: boolean
}> {

    render() {
        const {firstTimeRun} = this.props;
        if (firstTimeRun) {
            return this.renderTourPage();
        } else {
            return this.renderWelcomePage();
        }
    }

    renderWelcomePage() {
        const {showWhenUsingJava} = this.props;
        return (
            <Container fluid className="root">
                <Row className="mb-4">
                    <Col>
                        <Header />
                    </Col>
                </Row>
                <Row className="mb-4">
                    <Col>
                        <QuickActionPanel />
                    </Col>
                </Row>
                <Row className="mb-4">
                    <Col>
                        <NavigationPanel />
                    </Col>
                </Row>
                <Row className="mb-4 footer">
                    <Col>
                        <Row className="mb-2">
                            <Col>
                                <SocialMediaPanel />
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <ControllerPanel showWhenUsingJava={showWhenUsingJava}/>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Container>
        );
    }

    renderTourPage() {
        return <TourPage></TourPage>;
    }
}
