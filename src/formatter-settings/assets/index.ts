// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "bootstrap/js/src/tab";
import "bootstrap/js/src/collapse";
import "bootstrap/js/src/dropdown";
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../../assets/vscode.scss";
import { JavaFormatterPanel } from "./java.formatter";

export enum SettingsType {
    BOOLEAN = "boolean",
    ENUM = "enum",
    INTEGER = "integer",
}

export interface JavaFormatterSetting {
    name: string;
    type: SettingsType;
    value: string;
    candidates?: string[];
}

function render() {
    const a: JavaFormatterSetting = {
        name: "whitespace1", type: SettingsType.BOOLEAN, value: "false",
    };
    const b: JavaFormatterSetting = {
        name: "whitespace2", type: SettingsType.INTEGER, value: "123",
    };
    const c: JavaFormatterSetting = {
        name: "comments1", type: SettingsType.INTEGER, value: "123",
    };
    const d: JavaFormatterSetting = {
        name: "newLine1", type: SettingsType.INTEGER, value: "123",
    };
    const whitespaceSettings: JavaFormatterSetting[] = [a,b];
    const commentSettings: JavaFormatterSetting[] = [c];
    const newLineSettings: JavaFormatterSetting[] = [d];
    const props = {
        whitespaceSettings: whitespaceSettings,
        commentSettings: commentSettings,
        newLineSettings: newLineSettings,
    };

    ReactDOM.render(React.createElement(JavaFormatterPanel, props), document.getElementById("formatterPanel"));

    $("a.navigation").click(e => {
        ($($(e.target).attr("href") || "") as any).tab("show");
    });

}

render();

