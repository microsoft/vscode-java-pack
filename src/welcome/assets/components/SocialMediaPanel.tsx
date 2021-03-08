// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Icon } from "@iconify/react";
import twitterIcon from "@iconify-icons/codicon/twitter";
import githubIcon from "@iconify-icons/codicon/github-inverted";
import { ListGroup } from "react-bootstrap";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";

export default class SocialMediaPanel extends React.Component {
    render() {
        const links = [
            { name: "Twitter", command: "java.helper.openUrl", args: ["https://twitter.com/intent/tweet?via=code&hashtags=Java,HappyCoding"], icon: twitterIcon },
            { name: "Questions & Issues", command: "java.helper.openUrl", args: ["https://github.com/microsoft/vscode-java-pack/issues"], icon: githubIcon },
        ];
        const elements = links.map(link => (
            <a
              href={encodeCommandUriWithTelemetry(WEBVIEW_ID, link.name, link.command, link.args)}
              key={link.name}
            ><Icon className="codicon" icon={link.icon} width="1.2em" height="1.2em"/> {link.name}</a>

        ));
        return (
            <ListGroup>
                {elements}
            </ListGroup>
        );
    }
}
