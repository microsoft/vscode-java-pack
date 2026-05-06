// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { encodeCommandUriWithTelemetry } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";

const DEV_BLOG_LINK = "https://devblogs.microsoft.com/?s=Java+on+Visual+Studio+Code";

export default function Header() {
    const openBlogCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "blogs", "java.helper.openUrl", [DEV_BLOG_LINK]);
    const title = <h2>Java Help Center</h2>;
    const blogsLink = <a href={openBlogCommand}>blogs</a>;
    const subtitle = <span>Check our {blogsLink} to see what's new</span>;
    return (
      <div className="header mt-4">
        <div>
          {title}
          {subtitle}
        </div>
      </div>
    );
}
