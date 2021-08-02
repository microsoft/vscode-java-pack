// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { Form } from "react-bootstrap";
import { setWelcomeVisibility } from "../utils";

export default class ControllerPanel extends React.Component<{
    showWhenUsingJava?: boolean;
}> {
  render() {
    let {showWhenUsingJava} = this.props;

    return <Form>
        <Form.Check defaultChecked={showWhenUsingJava} label="Show welcome page when using Java" onChange={toggleVisibility}/>
    </Form>;
  }

}

function toggleVisibility(event: React.ChangeEvent<HTMLInputElement>) {
  setWelcomeVisibility(event.target.checked);
}
