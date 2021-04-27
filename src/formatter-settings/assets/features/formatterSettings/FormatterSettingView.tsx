// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { changeActiveCategory } from "./formatterSettingViewSlice";
import { highlight } from "./components/Highlight";
import { Category } from "../../../types";
import Setting from "./components/Setting";

const FormatterSettingsView = (): JSX.Element => {
  const activeCategory: Category = useSelector((state: any) => state.formatterSettings.activeCategory);
  const contentText: string = useSelector((state: any) => state.formatterSettings.formattedContent);
  const dispatch: Dispatch<any> = useDispatch();
  const onClickNaviBar = (element: any) => {
    switch (element) {
      case String(Category.Common):
        dispatch(changeActiveCategory(Category.Common));
        break;
      case String(Category.BlankLine):
        dispatch(changeActiveCategory(Category.BlankLine));
        break;
      case String(Category.Comment):
        dispatch(changeActiveCategory(Category.Comment));
        break;
      case String(Category.InsertLine):
        dispatch(changeActiveCategory(Category.InsertLine));
        break;
      case String(Category.Whitespace):
        dispatch(changeActiveCategory(Category.Whitespace));
        break;
      case String(Category.Wrapping):
        dispatch(changeActiveCategory(Category.Wrapping));
        break;
      default:
        break;
    }
  };

  const naviBar: JSX.Element = (
    <Nav activeKey={activeCategory} className="setting-nav flex-column" onSelect={onClickNaviBar}>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Common}>Common</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.BlankLine}>Blank Lines</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Comment}>Comment</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.InsertLine}>Insert Lines</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Whitespace}>Whitespace</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link className="p-0" eventKey={Category.Wrapping}>Wrapping</Nav.Link>
      </Nav.Item>
    </Nav>
  );

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
            <Col className="flex-grow-0 setting-container d-flex flex-row flex-lg-column flex-lg-nowrap">{<Setting/>}</Col>
            <Col className="preview-container d-flex">{highlight(contentText)}</Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default FormatterSettingsView;
