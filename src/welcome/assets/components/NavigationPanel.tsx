// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import React from 'react'
import Icon from '@iconify/react';
import gearIcon from '@iconify-icons/codicon/gear';
import globeIcon from '@iconify-icons/codicon/globe';
import mortarBoardIcon from '@iconify-icons/codicon/mortar-board';
import { ListGroup } from 'react-bootstrap';
import { encodeCommandUri } from '../utils';

export default class NavigationPanel extends React.Component {
  render() {
    const groups = [
      {
        name: "Configuration",
        icon: <Icon icon={gearIcon} />,
        actions: [
          { name: "Open Java Settings", command: "workbench.action.openSettings", args: ["java."] },
          { name: "Open Extension Guide", command: "java.extGuide" }
        ]
      },
      {
        name: "Spring",
        icon: <Icon icon={globeIcon} />,
        actions: [
          { name: "Spring Boot with VS Code", command: "java.helper.openUrl", args: ["https://code.visualstudio.com/docs/java/java-spring-boot"] },
          { name: "Spring PetClinic Sample Application", command: "java.helper.openUrl", args: ["https://github.com/spring-projects/spring-petclinic"] },
          { name: "Install Spring Boot Extension Pack ...", command: "java.helper.installExtension", args: ["pivotal.vscode-boot-dev-pack", "Spring Boot Extension Pack"] }
        ]
      },
      {
        name: "Student",
        icon: <Icon icon={mortarBoardIcon} />,
        actions: [
          // TBD
        ]
      },
    ]

    const tabItems = groups.map(group => {
      const actionItems = group.actions.map(action => (
        <ListGroup.Item
          action
          href={encodeCommandUri(action.command, action.args)}
          key={action.name}
        >{action.name}</ListGroup.Item>
      ));
      const titleNode = <div>{group.icon} {group.name}</div>;
      return (
        <Tab eventKey={group.name} title={titleNode} key={group.name}>
          <ListGroup>
            {actionItems}
          </ListGroup>
        </Tab>
      );
    });

    return (
      <Tabs defaultActiveKey={groups[0].name} id="navigationPanel">
        {tabItems}
      </Tabs>
    )
  }
}

