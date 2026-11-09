// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";
import { WEBVIEW_ID } from "../utils";

const DEV_BLOG_LINK = "https://devblogs.microsoft.com/?s=Java+on+Visual+Studio+Code";

export default function Header() {
    const openBlogCommand = encodeCommandUriWithTelemetry(WEBVIEW_ID, "blogs", "java.helper.openUrl", [DEV_BLOG_LINK]);
    const title = <h2>{l10n.t("Java Help Center")}</h2>;
    const blogsLink = <a href={openBlogCommand}>{l10n.t("blogs")}</a>;
    const subtitle = <span>{richText(l10n.t("Check our {0} to see what's new"), [blogsLink])}</span>;
    return (
      <div className="header mt-4">
        <div>
          {title}
          {subtitle}
        </div>
      </div>
    );
}
