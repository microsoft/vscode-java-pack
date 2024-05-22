// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { useSelector } from "react-redux";
import { encodeCommandUriWithTelemetry, supportedByNavigator } from "../../../../../utils/webview";
import { ClasspathViewException } from "../../../../types";
import { WEBVIEW_ID } from "../../utils";

const Exception = (): JSX.Element | null => {
  const exception: ClasspathViewException | undefined = useSelector((state: any) => state.classpathConfig.exception);

  let content: JSX.Element;
  switch (exception) {
    case ClasspathViewException.NoJavaProjects:
      let command: string = "workbench.action.files.openFolder";
      if (supportedByNavigator("mac")) {
        command = "workbench.action.files.openFileFolder";
      }
      content = (
        <div>
          <span>There is no Java projects opened in the current workspace. Please try to <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reload", "workbench.action.webview.reloadWebviewAction")}>reload the page</a> or <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openProject", command)}>open a Java project</a>.</span>
        </div>
      );
      break;
    case ClasspathViewException.JavaExtensionNotInstalled:
      content = (
        <div>
          <span>The required extension <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openJavaLanguageSupportMarketPlace", "extension.open", ["redhat.java"])}>Language Support for Java™ by Red Hat</a> is not installed or it's disabled. Please <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.installJavaLanguageSupport", "workbench.extensions.installExtension", ["redhat.java"])}>install</a> it in Visual Studio Code and <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reloadWebview", "workbench.action.webview.reloadWebviewAction")}>reload</a> the page after installation.</span>
        </div>
      );
      break;
    case ClasspathViewException.StaleJavaExtension:
      content = (
        <div>
          <span>The version of required extension <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openJavaLanguageSupportMarketPlace", "extension.open", ["redhat.java"])}>Language Support for Java™ by Red Hat</a> is too stale. Please <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.installJavaLanguageSupport", "workbench.extensions.installExtension", ["redhat.java"])}>update</a> it and <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reloadWebview", "workbench.action.webview.reloadWebviewAction")}>reload</a> the page.</span>
        </div>
      );
      break;
    default:
      return null;
  }

  return content;
};

export default Exception;
