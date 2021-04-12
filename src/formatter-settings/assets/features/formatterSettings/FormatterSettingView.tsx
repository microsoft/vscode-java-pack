// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect } from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { Catagory } from "../../../FormatterConstants";
import Header from "./components/Header";
import Common from "./components/Common";
import WhiteSpace from "./components/WhiteSpace";
import Preview from "./components/Preview";
import BlankLine from "./components/BlankLine";
import Comment from "./components/Comment";
import Wrapping from "./components/Wrapping";
import NewLine from "./components/NewLine";
import { changeActiveCatagory, applyFormatResult, initSetting, initVersion } from "./formatterSettingViewSlice";

const FormatterSettingsView = (): JSX.Element => {
  const activeCatagory: Catagory = useSelector((state: any) => state.formatterSettings.activeCatagory);
  let content: JSX.Element = <div></div>;

  const onClickNaviBar = (element: any) => {
    switch (element) {
      case String(Catagory.Common):
        dispatch(changeActiveCatagory(Catagory.Common));
        break;
      case String(Catagory.Blankline):
        dispatch(changeActiveCatagory(Catagory.Blankline));
        break;
      case String(Catagory.Comment):
        dispatch(changeActiveCatagory(Catagory.Comment));
        break;
      case String(Catagory.Newline):
        dispatch(changeActiveCatagory(Catagory.Newline));
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
    <Row>
      <Col>
        <Nav activeKey={activeCatagory} className="setting-nav flex-column" onSelect={onClickNaviBar}>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Common}>Common</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Blankline}>Blank Lines</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Comment}>Comment</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Newline}>New Lines</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Whitespace}>Whitespace</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={Catagory.Wrapping}>Wrapping</Nav.Link>
          </Nav.Item>
        </Nav>
      </Col>
    </Row>
  );

  const dispatch: Dispatch<any> = useDispatch();

  const onDidReceiveMessage = (event: any) => {
    if (event.data.command === "VSCodeToWebview.formattedCode") {
      dispatch(applyFormatResult(event.data));
    } else if (event.data.command === "VSCodeToWebview.initSetting") {
      dispatch(initSetting(event.data));
    } else if (event.data.command === "VSCodeToWebview.initVersion") {
      dispatch(initVersion(event.data));
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
    case Catagory.Blankline:
      content = (<BlankLine />);
      break;
    case Catagory.Comment:
      content = (<Comment />);
      break;
    case Catagory.Newline:
      content = (<NewLine />);
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
    <Container className="root">
      <Row className="setting-header">
        <Col>
          <Header />
        </Col>
      </Row>
      <Row>
        <Col xs="auto" sm="auto" md="auto" lg="auto">{naviBar}</Col>
        <Col xs={10} sm={10} md={10} lg={10}>
          <Row>
            <Col className="flex-lg-grow-0">{content}</Col>
            <Col lg={7}><Preview/></Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default FormatterSettingsView;
