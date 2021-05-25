// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { applyFormatResult, changeActiveCategory, changeReadOnlyState, loadProfileSetting, loadVSCodeSetting } from "./formatterSettingViewSlice";
import { highlight } from "./components/Highlight";
import { Category, ExampleKind } from "../../../types";
import Setting from "./components/Setting";
import { renderWhitespace } from "../../whitespace";
import { onWillChangeExampleKind, onWillDownloadAndUse, onWillInitialize } from "../../utils";

const FormatterSettingsView = (): JSX.Element => {
  const activeCategory: Category = useSelector((state: any) => state.formatterSettings.activeCategory);
  const contentText: string = useSelector((state: any) => state.formatterSettings.formattedContent);
  const readOnly: boolean = useSelector((state: any) => state.formatterSettings.readOnly);
  const title: string = "Java Formatter Settings" + (readOnly ? " (Read Only)" : "");

  const dispatch: Dispatch<any> = useDispatch();
  const onClickNaviBar = (element: any) => {
    const activeCategory: Category = Number(element);
    dispatch(changeActiveCategory(activeCategory));
    let exampleKind: ExampleKind = ExampleKind.INDENTATION_EXAMPLE;
    switch (activeCategory) {
      case Category.BlankLine:
        exampleKind = ExampleKind.BLANKLINE_EXAMPLE;
        break;
      case Category.Comment:
        exampleKind = ExampleKind.COMMENT_EXAMPLE;
        break;
      case Category.Indentation:
        exampleKind = ExampleKind.INDENTATION_EXAMPLE;
        break;
      case Category.InsertLine:
        exampleKind = ExampleKind.INSERTLINE_EXAMPLE;
        break;
      case Category.Whitespace:
        exampleKind = ExampleKind.WHITESPACE_EXAMPLE;
        break;
      case Category.Wrapping:
        exampleKind = ExampleKind.WRAPPING_EXAMPLE;
        break;
      default:
        exampleKind = ExampleKind.INDENTATION_EXAMPLE;
    }
    onWillChangeExampleKind(exampleKind);
  };

  const naviBar: JSX.Element = (
    <Nav activeKey={activeCategory} className="setting-nav flex-column" onSelect={onClickNaviBar}>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Indentation}>Indentation</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.BlankLine}>Blank Lines</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Comment}>Comment</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.InsertLine}>Insert Line</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Whitespace}>Whitespace</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Wrapping}>Wrapping</Nav.Link>
      </Nav.Item>
    </Nav>
  );

  const onDidReceiveMessage = (event: any) => {
    if (event.data.command === "formattedContent") {
      dispatch(applyFormatResult(event.data));
    } else if (event.data.command === "loadProfileSetting") {
      dispatch(loadProfileSetting(event.data));
    } else if (event.data.command === "loadVSCodeSetting") {
      dispatch(loadVSCodeSetting(event.data));
    } else if (event.data.command === "changeReadOnlyState") {
      dispatch(changeReadOnlyState(event.data));
    }
  };

  useEffect(() => {
    window.addEventListener("message", onDidReceiveMessage);
    onWillInitialize();
    return () => window.removeEventListener("message", onDidReceiveMessage);
  }, []);

  useEffect(() => {
    renderWhitespace();
  }, [contentText]);

  return (
    <Container className="root d-flex flex-column">
      <Row className="setting-header">
        <Col><h2 className="mb-0">{title}</h2></Col>
        <Col className="flex-grow-0">{readOnly && (<div><a className="btn btn-primary float-right edit-button" role="button" title="Download and edit profile" onClick={() => onWillDownloadAndUse()}>Download and Edit</a></div>)}</Col>
      </Row>
      <Row className="flex-grow-1 d-flex flex-nowrap view-body">
        <Col className="flex-grow-0">{naviBar}</Col>
        <Col className="d-flex view-content">
          <Row className="flex-grow-1 flex-nowrap flex-column flex-lg-row d-flex w-100 h-100">
            <Col className="flex-grow-0 setting-container d-flex flex-row flex-lg-column flex-lg-nowrap">{<Setting />}</Col>
            <Col className="preview-container d-flex">{highlight(contentText)}</Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default FormatterSettingsView;
