// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { richText } from "../../../../../l10n/richText";
import * as l10n from "@vscode/l10n";
import { useSelector } from "react-redux";
import { encodeCommandUriWithTelemetry, supportedByNavigator } from "../../../../../utils/webview";
import { ProjectSettingsException } from "../../../../types";
import { WEBVIEW_ID } from "../../../classpath/utils";

const Exception = (): JSX.Element | null => {
  const exception: ProjectSettingsException | undefined = useSelector((state: any) => state.commonConfig.ui.exception);

  let content: JSX.Element;
  switch (exception) {
    case ProjectSettingsException.NoJavaProjects:
      let command: string = "workbench.action.files.openFolder";
      if (supportedByNavigator("mac")) {
        command = "workbench.action.files.openFileFolder";
      }
      content = (
        <span>{richText(l10n.t("There are no Java projects opened in the current workspace. Please try to {0} or {1}."), [<a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reload", "workbench.action.webview.reloadWebviewAction")}>{l10n.t("reload the page")}</a>, <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openProject", command)}>{l10n.t("open a Java project")}</a>])}</span>
      );
      break;
    case ProjectSettingsException.JavaExtensionNotInstalled:
      content = (
        <span>{richText(l10n.t("The required extension {0} is not installed or it's disabled. Please {1} it in Visual Studio Code and {2} the page after installation."), [<a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openJavaLanguageSupportMarketPlace", "extension.open", ["redhat.java"])}>{l10n.t("Language Support for Java™ by Red Hat")}</a>, <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.installJavaLanguageSupport", "workbench.extensions.installExtension", ["redhat.java"])}>{l10n.t("install")}</a>, <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reloadWebview", "workbench.action.webview.reloadWebviewAction")}>{l10n.t("reload")}</a>])}</span>
      );
      break;
    case ProjectSettingsException.StaleJavaExtension:
      content = (
        <span>{richText(l10n.t("The version of required extension {0} is too stale. Please {1} it and {2} the page."), [<a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.openJavaLanguageSupportMarketPlace", "extension.open", ["redhat.java"])}>{l10n.t("Language Support for Java™ by Red Hat")}</a>, <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.installJavaLanguageSupport", "workbench.extensions.installExtension", ["redhat.java"])}>{l10n.t("update")}</a>, <a href={encodeCommandUriWithTelemetry(WEBVIEW_ID, "classpath.reloadWebview", "workbench.action.webview.reloadWebviewAction")}>{l10n.t("reload")}</a>])}</span>
      );
      break;
    default:
      return null;
  }

  return (<div className="pl-3 pr-3 pt-3 pb-3">
    {content}
  </div>
  );
};

export default Exception;
