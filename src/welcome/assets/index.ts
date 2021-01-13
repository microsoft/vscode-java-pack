
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { GetStartedPage } from "./components/GetStartedPage";


function render() {
    ReactDOM.render(React.createElement(GetStartedPage), document.getElementById("content"));
}

render();
