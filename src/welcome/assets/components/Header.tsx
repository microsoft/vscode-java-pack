import * as React from 'react';

export default class Header extends React.Component {
    render() {
        const title = "Java for Visual Studio Code";
        const subtitle = "Checkout changelog to see what's new";
        return (
            <div>
                <div className="row">
                    <div className="col">
                        <img src="" alt="Java logo"/>
                    </div>
                    <div className="col">
                        <h1>{title}</h1>
                        <small>{subtitle}</small>
                    </div>
                </div>
            </div>
        )
    }
}
