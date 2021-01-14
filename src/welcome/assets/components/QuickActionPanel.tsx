// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from 'react';
import { ListGroup } from 'react-bootstrap';
import { encodeCommandUri } from '../utils';

export default class QuickActionPanel extends React.Component {
    render() {
        const actions = [
            { name: "Create a New Project", command: "java.project.create" },
            { name: "Open an Existing Project", command: "workbench.action.files.openFolder", os: "win" },
            // { name: "Open an Existing Project", command: "workbench.action.files.openFileFolder", os: "mac" },
            { name: "Configure Java Runtime", command: "java.runtime" }
        ];
        const actionItems = actions.map(action => (
            <ListGroup.Item
                action
                href={encodeCommandUri(action.command)}
                key={action.name}
                className="mb-2"
            >{action.name}</ListGroup.Item>
        ));
        return (
            <div>
                <h5>Get Started</h5>
                <ListGroup>
                    {actionItems}
                </ListGroup>
            </div>

        )
    }
}
