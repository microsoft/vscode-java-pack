// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { applyFormatResult, changeActiveCategory, changeReadOnlyState, loadProfileSetting, loadVSCodeSetting } from "./formatterSettingViewSlice";
import { highlight } from "./components/Highlight";
import { Category, ExampleKind } from "../../../types";
import Setting from "./components/Setting";
import { renderWhitespace } from "../../whitespace";
import { onWillChangeExampleKind, onWillDownloadAndUse, onWillInitialize } from "../../utils";

const categories = [
  { key: Category.Indentation, label: "Indentation", example: ExampleKind.INDENTATION_EXAMPLE },
  { key: Category.BlankLine, label: "Blank Lines", example: ExampleKind.BLANKLINE_EXAMPLE },
  { key: Category.Comment, label: "Comment", example: ExampleKind.COMMENT_EXAMPLE },
  { key: Category.InsertLine, label: "Insert Line", example: ExampleKind.INSERTLINE_EXAMPLE },
  { key: Category.Whitespace, label: "Whitespace", example: ExampleKind.WHITESPACE_EXAMPLE },
  { key: Category.Wrapping, label: "Wrapping", example: ExampleKind.WRAPPING_EXAMPLE },
];

const FormatterSettingsView = (): JSX.Element => {
  const activeCategory: Category = useSelector((state: any) => state.formatterSettings.activeCategory);
  const contentText: string = useSelector((state: any) => state.formatterSettings.formattedContent);
  const readOnly: boolean = useSelector((state: any) => state.formatterSettings.readOnly);
  const title: string = "Java Formatter Settings" + (readOnly ? " (Read Only)" : "");

  const dispatch: Dispatch<any> = useDispatch();
  const onClickNaviBar = (cat: Category, exampleKind: ExampleKind) => {
    dispatch(changeActiveCategory(cat));
    onWillChangeExampleKind(exampleKind);
  };

  const naviBar = (
    <nav className="setting-nav flex-column">
      {categories.map(cat => (
        <a
          key={cat.key}
          className={`nav-link p-0${activeCategory === cat.key ? " active" : ""}`}
          onClick={() => onClickNaviBar(cat.key, cat.example)}
          role="button"
        >
          {cat.label}
        </a>
      ))}
    </nav>
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
    <div className="container root d-flex flex-column">
      <div className="row setting-header">
        <div className="col"><h2 className="mb-0">{title}</h2></div>
        <div className="col flex-grow-0">{readOnly && (<div><a className="btn btn-primary float-right edit-button" role="button" title="Download and edit profile" onClick={() => onWillDownloadAndUse()}>Download and Edit</a></div>)}</div>
      </div>
      <div className="row flex-grow-1 d-flex flex-nowrap view-body">
        <div className="col flex-grow-0">{naviBar}</div>
        <div className="col d-flex view-content">
          <div className="row flex-grow-1 flex-nowrap flex-column flex-lg-row d-flex w-100 h-100">
            <div className="col flex-grow-0 setting-container d-flex flex-row flex-lg-column flex-lg-nowrap"><Setting /></div>
            <div className="col preview-container d-flex">{highlight(contentText)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatterSettingsView;
