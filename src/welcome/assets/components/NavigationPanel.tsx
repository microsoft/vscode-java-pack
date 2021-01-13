
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import React from 'react'

export default class NavigationPanel extends React.Component {
    render() {
        return (
            <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                <Tab eventKey="group1" title="group1">
                    content1
                </Tab>
                <Tab eventKey="group2" title="group2">
                    content2
                </Tab>
                <Tab eventKey="group3" title="group3">
                    content3
                </Tab>
            </Tabs>
        )
    }
}

