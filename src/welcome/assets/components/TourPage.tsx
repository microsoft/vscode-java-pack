// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { Component } from 'react'
import { Container, Row, Col, Button } from 'react-bootstrap'
import { showWelcomePage } from '../utils';

const logoIcon = require("../../../../logo.png");
const doneIcon = require("../resources/done.svg");

export default class TourPage extends Component<{
}, {
    step: number
}> {
    constructor(props: any) {
        super(props);
        this.state = {
            step: 0
        };
    }

    render() {
        const startPage = this.getStartingPage();
        const endPage = this.getEndingPage();
        const contentPages = this.getContentPages();
        const steps = [
            startPage,
            ...contentPages,
            endPage
        ]
        const { step } = this.state;

        if (step >= steps.length) {
            showWelcomePage(false);
            return <div>Loading...</div>;
        }
        return (
            <Container fluid className="root">
                <Row className="mb-4 mt-5">
                    <Col className="text-center page-content">
                        {steps[step]}

                    </Col>
                </Row>
                <Row className="mb-4 footer">
                    <Col>
                        <div className="page-indicator text-center">
                            {steps.map((_elem, index) =>
                                <span key={index} className={index === step ? "active dot" : "dot"}></span>
                            )}
                        </div>
                    </Col>
                </Row>
            </Container>
        )
    }

    nextStep = () => {
        const newStep = this.state.step + 1;
        this.setState({
            step: newStep
        })
    }

    getContentPages = () => {
        /**
         * TODO: 
         * Provide 4 pages:
         * 1. open folder: for full features
         * 2. project view
         * 3. run/debug: point out the entry we want to promote
         * 4. testing
         * 
         * Polish screenshots to highlight entries.
         */

        const content = [{
            title: "Project Explorer",
            description: "Expand Java Project Explorer to view your project structure",
            imageUri: require("../resources/project-manager.png")
        },
        {
            title: "Running and Debugging",
            description: "Use the Debug view to Run/Debug a Java project.",
            imageUri: require("../resources/debugger.png")
        },
        {
            title: "Testing",
            description: "Use the Testing view to run unit tests.",
            imageUri: require("../resources/testing.png")
        }];

        return content.map((elem) => <div className="text-center">
            <h2>{elem.title}</h2>
            <div>{elem.description}</div>
            <img src={elem.imageUri} alt={elem.title} />
            <Button onClick={this.nextStep}>Next Step</Button>
            <div><a href="#" onClick={() => showWelcomePage(false)}>skip</a></div>
        </div>, this);
    }

    getStartingPage = () => {
        return <div>
            <img src={logoIcon} alt="logo" className="logo"></img>
            <h2>Welcome to Java Tools on VS Code</h2>
            <div>Value proposition for Java extension</div>
            <div><Button onClick={this.nextStep}>Get Started</Button></div>
            <div><a href="#" onClick={() => showWelcomePage(false)}>skip</a></div>
        </div>;
    }

    getEndingPage = () => {
        return <div>
            <img src={doneIcon} alt="logo" className="logo"></img>
            <h2>You’re good to go!</h2>
            <div>Next, start using Java!</div>
            <div><Button onClick={this.nextStep}>What next?</Button></div>
        </div>;
    }
}

