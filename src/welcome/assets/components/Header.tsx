// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";
const logo = require("../../../../logo.svg");

export default class Header extends React.Component {
  render() {
    const openBlogCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "blogs", "java.helper.openUrl", ["https://devblogs.microsoft.com/java/?s=Java+on+Visual+Studio+Code"]);
    const title = <h2>Java Tools</h2>;
    const blogsLink = <a href={openBlogCommand}>blogs</a>;
    const subtitle = <span>Check our {blogsLink} to see what's new</span>;
    return (
      <div className="header mt-4">
        <img alt="logo" src={logo} className="logo"></img>
        <div>
          {title}
          {subtitle}
        </div>
      </div>
    );
  }
}
