// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { Highlighter } from "../utils/Highlight";

const Preview = (): JSX.Element => {

  const format: boolean = useSelector((state: any) => state.formatterSettings.format);
  const content: string = format ? useSelector((state: any) => state.formatterSettings.formattedContent) : useSelector((state: any) => state.formatterSettings.content);
  return (
    <Col>
      <Row className="setting-section-header mb-0 h4 preview-header">Preview{(format === true) ? "" : "(Raw Code)"}</Row>
      <Row>{Highlighter(content)}</Row>
    </Col>
  );
};

export default Preview;
