import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";

import { validateAndRecommendExtension } from "../utils";
import { instrumentCommand } from "../command";

const KEY_XML_RECOMMENDATION_LAST_SHOW_TIME = "xmlRecommendationLastShowTime";
const EXTENSION_NAME = "redhat.vscode-xml";
const RECOMMENDATION_MESSAGE = "XML extension is recommended to check the syntax when editing pom.xml.";

function isPomDotXml(uri: vscode.Uri) {
  return !!uri.path && uri.path.toLowerCase().endsWith("pom.xml");
}

export function initialize (context: vscode.ExtensionContext) {
  const recommendationHandler = instrumentCommand(context, "recommendExtension", extensionRecommendationHandler);
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => {
    if (isPomDotXml(e.uri)) {
      recommendationHandler(EXTENSION_NAME, RECOMMENDATION_MESSAGE);
    }
  }));

  let isPomDotXmlOpened = vscode.workspace.textDocuments.findIndex(doc => isPomDotXml(doc.uri)) !== -1;
  if (isPomDotXmlOpened) {
    recommendationHandler(EXTENSION_NAME, RECOMMENDATION_MESSAGE);
  }
}

function extensionRecommendationHandler(context: vscode.ExtensionContext, operationId: string, extName: string, message: string) {
  let timeStamp = context.globalState.get(KEY_XML_RECOMMENDATION_LAST_SHOW_TIME);
  if (timeStamp !== undefined) {
    return;
  }

  sendInfo(operationId, {
    extName: extName
  }, {});

  context.globalState.update(KEY_XML_RECOMMENDATION_LAST_SHOW_TIME, Date.now().toString());

  validateAndRecommendExtension(extName, message);
}
