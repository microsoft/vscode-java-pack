import * as React from 'react';

export default class QuickActionPanel extends React.Component {
    render() {
        const actions = [
            { name: "Create a New Project", command: "java.project.create" },
            { name: "Open an Existing Project", command: "workbench.action.files.openFolder", os: "win" },
            // { name: "Open an Existing Project", command: "workbench.action.files.openFileFolder", os: "mac" },
            { name: "Configure Java Runtime", command: "java.runtime" }
        ];
        const actionButtons = actions.map(action => {
            return <a href={`command:${action.command}`} className="btn btn-primary" key={action.command}>{action.name}</a>;
        })
        return (
            <div>
                <p>Getting Started</p>
                {actionButtons}
            </div>
        )
    }
}
