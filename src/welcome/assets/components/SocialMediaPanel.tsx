// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from 'react';
import { Icon } from '@iconify/react';
import twitterIcon from '@iconify-icons/codicon/twitter';
import githubIcon from '@iconify-icons/codicon/github-inverted';

export default class SocialMediaPanel extends React.Component {
    render() {
        return (
            <div>
                <div>
                    <Icon icon={twitterIcon} className="mr-1"/>
                    <a href="https://twitter.com/code">code</a>
                </div>
                <div>
                    <Icon icon={githubIcon} className="mr-1"/>
                    <a href="https://github.com/microsoft/vscode-java-pack/issues">microsoft/vscode-java-pack</a>
                </div>
            </div>
        );
    }
}
