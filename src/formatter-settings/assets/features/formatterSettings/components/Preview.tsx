// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dispatch } from "@reduxjs/toolkit";
import React from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { applySettingChange } from "../formatterSettingViewSlice";
import { Highlighter } from "../utils/Highlight";

const Preview = (): JSX.Element => {

  const dispatch: Dispatch<any> = useDispatch();

  const handleApply = () => {
    dispatch(applySettingChange(undefined));
  };

  const format: boolean = useSelector((state: any) => state.formatterSettings.format);
  const content: string = format ? useSelector((state: any) => state.formatterSettings.formattedContent) : useSelector((state: any) => state.formatterSettings.content);
  const changed: boolean = useSelector((state: any) => state.formatterSettings.settingsChanged);
  return (
    <div>
      <div className="setting-section-header mb-1">
        <h4 className="mb-0">Preview{(format === true) ? "" : "(Raw Code)"}</h4>
      </div>
      <div style={{ height: "400px", overflow: "auto", border:"1px solid"}}>{Highlighter(content)}</div>
      <Row>
        <Col className="col-10"></Col>
        <Col className="col-2">
          <Button className={changed ? "" : "disabled"} aria-disabled={!changed} onClick={handleApply}>Apply</Button>
        </Col>
      </Row>
    </div>
  );
};

export default Preview;
