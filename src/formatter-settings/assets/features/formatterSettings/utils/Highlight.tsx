// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as hljs from "highlight.js";
import "highlight.js/styles/vs2015.css";

export function Highlighter(content: string, language?: string): JSX.Element {
  const highlighted = language ? hljs.highlight(language, content) : hljs.highlightAuto(content);
  return (
    <pre className="hljs">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted.value }} />
    </pre>
  );
}
