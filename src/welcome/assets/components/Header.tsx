// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from 'react';
const logo = require("../../../../logo.png");

export default class Header extends React.Component {
  render() {
    const title = <h1>Java for Visual Studio Code</h1>;
    const blogsLink = <a href="https://devblogs.microsoft.com/java/?s=Java+on+Visual+Studio+Code">blogs</a>;
    const subtitle = <small>Checkout our {blogsLink} to see what's new</small>;
    return (
      <div>
        <img alt="logo"src={logo}
            width="64" height="64"
            className="d-inline-block align-top"
          />{' '}
          {title}
          {subtitle}
      </div>
    )
  }
}
