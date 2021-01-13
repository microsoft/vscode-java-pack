import * as React from 'react';

export default class SocialMediaPanel extends React.Component {
    render() {
        const channels = [
            { name: "code", link: "https://twitter.com/code" },
            { name: "microsoft/vscode-java-pack", link: "https://github.com/microsoft/vscode-java-pack/issues" }
        ];
        const links = channels.map(channel => {
            return <a href={channel.link} key={channel.link}>{channel.name}</a>;
        });
        return (
            <div>
                {links}
            </div>
        );
    }
}
