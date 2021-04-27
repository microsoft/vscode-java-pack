// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import React from "react";
import Icon from "@iconify/react";
import gearIcon from "@iconify-icons/codicon/gear";
import globeIcon from "@iconify-icons/codicon/globe";
import mortarBoardIcon from "@iconify-icons/codicon/mortar-board";
import rocketIcon from "@iconify-icons/codicon/rocket";
import { ListGroup } from "react-bootstrap";
import { reportTabSwitch, WEBVIEW_ID } from "../utils";
import { encodeCommandUriWithTelemetry } from "../../../utils/webview";

export default class NavigationPanel extends React.Component {
  private groups = [
    {
      name: "Configuration",
      icon: <Icon className="codicon" icon={gearIcon} />,
      actions: [
        { name: "Configure Java Runtime", command: "java.runtime" },
        { name: "Open Java Settings", command: "workbench.action.openSettings", args: ["java."] },
        { name: "Install Extensions...", command: "java.extGuide" }
      ]
    },
    {
      name: "Spring",
      icon: <Icon className="codicon" icon={globeIcon} />,
      actions: [
        { name: "Spring Boot with VS Code", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-spring-boot"] },
        { name: "Spring PetClinic Sample Application", command: "java.helper.openUrl", args: ["https://github.com/spring-projects/spring-petclinic"] },
        { name: "Install Spring Boot Extension Pack ...", command: "java.helper.installExtension", args: ["pivotal.vscode-boot-dev-pack", "Spring Boot Extension Pack"] }
      ]
    },
    {
      name: "Student",
      icon: <Icon className="codicon" icon={mortarBoardIcon} />,
      actions: [
        { name: "Getting Started", command: "java.gettingStarted" },
        { name: "Tutorial: Running and Debugging", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-debugging"] },
        { name: "Tutorial: Testing", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-testing"] },
        { name: "Configure Sources, Dependencies, Output Folder...", command: "java.classpathConfiguration"}
      ]
    },
  ];

  private currentTab: string = this.groups[0].name;

  render() {
    const itemIcon = <Icon className="codicon" icon={rocketIcon} />;
    const tabItems = this.groups.map(group => {
      const actionItems = group.actions.map(action => (
        <a
          href={encodeCommandUriWithTelemetry(WEBVIEW_ID, action.name, action.command, action.args)}
          key={action.name}
        >{itemIcon} {action.name}</a>
      ));
      const titleNode = <div className="navigation-title">{group.icon} {group.name}</div>;
      return (
        <Tab eventKey={group.name} title={titleNode} key={group.name} className="navigation-tabcontent" tabClassName="navigation-tab">
          <ListGroup>
            {actionItems}
          </ListGroup>
        </Tab>
      );
    });

    return (
      <Tabs defaultActiveKey={this.currentTab} id="navigationPanel" onSelect={this.onSwitchTab}>
        {tabItems}
      </Tabs>
    );
  }

  onSwitchTab = (eventKey: string | null, _e: React.SyntheticEvent<unknown>) => {
    if (eventKey) {
      reportTabSwitch(this.currentTab, eventKey);
      this.currentTab = eventKey;
    }
  }

}
