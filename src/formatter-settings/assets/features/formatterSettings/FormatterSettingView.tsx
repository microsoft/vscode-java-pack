// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import Common from "./components/Common";
import WhiteSpace from "./components/WhiteSpace";
import BlankLine from "./components/BlankLine";
import Comment from "./components/Comment";
import Wrapping from "./components/Wrapping";
import InsertLine from "./components/InsertLine";
import { changeActiveCatagory, applyFormatResult, initSetting, changeSetting } from "./formatterSettingViewSlice";
import { Highlighter } from "./utils/Highlight";
import { Catagory } from "../../../types";

const FormatterSettingsView = (): JSX.Element => {
  const activeCatagory: Catagory = useSelector((state: any) => state.formatterSettings.activeCatagory);
  const contentText: string = useSelector((state: any) => state.formatterSettings.formattedContent);

  let content: JSX.Element = <div></div>;

  const onClickNaviBar = (element: any) => {
    switch (element) {
      case String(Catagory.Common):
        dispatch(changeActiveCatagory(Catagory.Common));
        break;
      case String(Catagory.BlankLine):
        dispatch(changeActiveCatagory(Catagory.BlankLine));
        break;
      case String(Catagory.Comment):
        dispatch(changeActiveCatagory(Catagory.Comment));
        break;
      case String(Catagory.InsertLine):
        dispatch(changeActiveCatagory(Catagory.InsertLine));
        break;
      case String(Catagory.Whitespace):
        dispatch(changeActiveCatagory(Catagory.Whitespace));
        break;
      case String(Catagory.Wrapping):
        dispatch(changeActiveCatagory(Catagory.Wrapping));
        break;
      default:
        break;
    }
  };

  const naviBar: JSX.Element = (
    <Nav activeKey={activeCatagory} className="setting-nav flex-column" onSelect={onClickNaviBar}>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.Common}>Common</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.BlankLine}>Blank Lines</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.Comment}>Comment</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.InsertLine}>Insert Lines</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.Whitespace}>Whitespace</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link eventKey={Catagory.Wrapping}>Wrapping</Nav.Link>
      </Nav.Item>
    </Nav>
  );

  const dispatch: Dispatch<any> = useDispatch();

  const onDidReceiveMessage = (event: any) => {
    if (event.data.command === "VSCodeToWebview.formattedCode") {
      dispatch(applyFormatResult(event.data));
    } else if (event.data.command === "VSCodeToWebview.initSetting") {
      dispatch(initSetting(event.data));
    } else if (event.data.command === "VSCodeToWebview.changeSetting") {
      dispatch(changeSetting(event.data));
    } 
  };

  useEffect(() => {
    window.addEventListener("message", onDidReceiveMessage);
    return () => window.removeEventListener("message", onDidReceiveMessage);
  }, []);

  switch (activeCatagory) {
    case Catagory.Common:
      content = (<Common />);
      break;
    case Catagory.BlankLine:
      content = (<BlankLine />);
      break;
    case Catagory.Comment:
      content = (<Comment />);
      break;
    case Catagory.InsertLine:
      content = (<InsertLine />);
      break;
    case Catagory.Whitespace:
      content = (<WhiteSpace />);
      break;
    case Catagory.Wrapping:
      content = (<Wrapping />);
      break;
    default:
  }

  return (
    <Container className="root d-flex flex-column">
      <Row>
        <Col className="setting-header">
          <h2 className="mb-0">Java Formatter Settings</h2>
        </Col>
      </Row>
      <Row className="flex-grow-1 d-flex flex-nowrap view-body">
        <Col className="flex-grow-0">{naviBar}</Col>
        <Col className="d-flex view-content">
          <Row className="flex-nowrap flex-column flex-lg-row d-flex w-100 h-100">
            <Col className="flex-grow-0 setting-container d-flex flex-row flex-lg-column flex-lg-nowrap">{content}</Col>
            <Col className="preview-container d-flex">{Highlighter(contentText, "java")}</Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default FormatterSettingsView;
