// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { extensionRecommendationHandler } from "./handler";

const EXTENSION_NAME = "redhat.vscode-xml";
const RECOMMENDATION_MESSAGE = "XML extension is recommended to check the syntax when editing pom.xml.";

function isPomDotXml(uri: vscode.Uri) {
  return !!uri.path && uri.path.toLowerCase().endsWith("pom.xml");
}

export function initialize (context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => {
    if (isPomDotXml(e.uri)) {
      extensionRecommendationHandler(context, EXTENSION_NAME, RECOMMENDATION_MESSAGE);
    }
  }));

  let isPomDotXmlOpened = vscode.workspace.textDocuments.findIndex(doc => isPomDotXml(doc.uri)) !== -1;
  if (isPomDotXmlOpened) {
    extensionRecommendationHandler(context, EXTENSION_NAME, RECOMMENDATION_MESSAGE);
  }
}
