// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Col, Container, Row } from "react-bootstrap";
import Header from "./Header";
import NavigationPanel from "./NavigationPanel";
import QuickActionPanel from "./QuickActionPanel";
import SocialMediaPanel from "./SocialMediaPanel";

export class GetStartedPage extends React.Component {
    
    render() {
        return (
            <Container>
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
                <Row className="mb-4">
                    <Col>
                        <SocialMediaPanel />
                    </Col>
                </Row>
            </Container>
        );
    }
}
