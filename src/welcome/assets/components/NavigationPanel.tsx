// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import { useState, useRef } from "react";
import { reportTabSwitch, WEBVIEW_ID } from "../utils";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";

interface NavigationPanelProps {
  isAwtDisabled: boolean;
}

const groups = [
  {
    name: "General",
    iconClass: "codicon codicon-gear",
    actions: [
      { name: "Configure Java Runtime", command: "java.runtime" },
      { name: "Open Java Settings", command: "workbench.action.openSettings", args: ["java."] as string[] },
      { name: "Install Extensions...", command: "java.extGuide" },
      { name: "Configure Formatter Settings", command: "java.formatterSettings" }
    ]
  },
  {
    name: "Spring",
    iconClass: "codicon codicon-globe",
    actions: [
      { name: "Spring Boot with VS Code", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-spring-boot"] },
      { name: "Spring PetClinic Sample Application", command: "java.helper.openUrl", args: ["https://github.com/spring-projects/spring-petclinic"] },
      { name: "Install Spring Boot Extension Pack ...", command: "java.helper.installExtension", args: ["vmware.vscode-boot-dev-pack", "Spring Boot Extension Pack"] }
    ]
  },
  {
    name: "Student",
    iconClass: "codicon codicon-mortar-board",
    actions: [
      { name: "Coding and Debugging Tips", command: "java.gettingStarted" },
      { name: "Tutorial: Running and Debugging", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-debugging"] },
      { name: "Tutorial: Testing", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-testing"] },
      { name: "Configure Sources, Dependencies, Output Folder...", command: "java.classpathConfiguration" },
      { name: "Quick Start: Jupyter Notebook for Java", command: "java.helper.openUrl", args: ["https://github.com/microsoft/vscode-java-pack/wiki/Quick-Start:-Jupyter-Notebook-for-Java"] },
      { name: "Enable AWT Development", command: "java.toggleAwtDevelopment", args: [true] as any[] },
    ]
  },
];

export default function NavigationPanel({ isAwtDisabled }: NavigationPanelProps) {
  const [activeTab, setActiveTab] = useState(groups[0].name);
  const prevTabRef = useRef(groups[0].name);

  const studentSection = _.find(groups, { name: "Student" });
  if (studentSection) {
    for (const action of studentSection.actions) {
      if (action.command === "java.toggleAwtDevelopment") {
        action.name = `${isAwtDisabled ? "Enable" : "Disable"} AWT Development`;
        action.args = [isAwtDisabled];
      }
    }
  }

  const onSwitchTab = (newTab: string) => {
    reportTabSwitch(prevTabRef.current, newTab);
    prevTabRef.current = newTab;
    setActiveTab(newTab);
  };

  return (
    <div id="navigationPanel">
      <ul className="nav-tabs" role="tablist">
        {groups.map(group => (
          <li key={group.name} className="navigation-tab">
            <button
              role="tab"
              className={`nav-link${activeTab === group.name ? " active" : ""}`}
              onClick={() => onSwitchTab(group.name)}
              aria-selected={activeTab === group.name}
            >
              <div className="navigation-title">
                <i className={group.iconClass}></i> {group.name}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {groups.map(group => (
        activeTab === group.name && (
          <div key={group.name} className="navigation-tabcontent" role="tabpanel">
            <div className="list-group">
              {group.actions.map(action => (
                <a
                  href={encodeCommandUriWithTelemetry(WEBVIEW_ID, action.name, action.command, action.args)}
                  key={action.name}
                ><i className="codicon codicon-rocket"></i> {action.name}</a>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
