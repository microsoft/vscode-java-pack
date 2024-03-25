// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateSource } from "../classpathConfigurationViewSlice";
import { onWillSelectFolder } from "../../../utils";
import { VSCodeButton, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { ClasspathEntry, ClasspathEntryKind } from "../../../../types";

const Sources = (): JSX.Element => {

  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.sources[state.classpathConfig.activeProjectIndex]);
  const defaultOutput: string = useSelector((state: any) => state.classpathConfig.output[state.classpathConfig.activeProjectIndex]);

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editingSourcePath, setEditingSourcePath] = useState<string | null>(null);
  const [editingOutputPath, setEditingOutputPath] = useState<string | null>(defaultOutput);

  const dispatch: Dispatch<any> = useDispatch();

  const handleRemove = (path: string) => {
    const updatedSources: ClasspathEntry[] = [];
    for (const sourceRoot of sources) {
      if (sourceRoot.path === path) {
        continue;
      }
      updatedSources.push(sourceRoot);
    }
    dispatch(updateSource(updatedSources));
  };

  const handleAdd = () => {
    setEditingSourcePath(null);
    setEditingOutputPath(defaultOutput);
    setEditRow(sources.length);
  };

  const handleEdit = (source: string, output: string, index: number) => {
    setEditRow(index);
    setEditingSourcePath(source);
    setEditingOutputPath(output);
  }

  const handleOK = () => {
    const updatedSources: ClasspathEntry[] = sources.map((source, index) => {
      if (index === editRow && editingSourcePath) {
        return {
          kind: ClasspathEntryKind.Source,
          path: editingSourcePath,
          output: editingOutputPath ?? undefined,
          attributes: source.attributes,
        };
      }
      return source;
    });

    if (editRow === sources.length) {
      updatedSources.push({
        kind: ClasspathEntryKind.Source,
        path: editingSourcePath!,
        output: editingOutputPath ?? undefined,
      });
    }
    dispatch(updateSource(updatedSources));
    setEditRow(null);
    setEditingSourcePath(null);
    setEditingOutputPath(defaultOutput);
  }

  const handleCancel = () => {
    setEditRow(null);
    setEditingSourcePath(null);
    setEditingOutputPath(defaultOutput);
  }

  const handleBrowse = (type: string) => {
    onWillSelectFolder(type);
  }

  const messageHandler = (event: any) => {
    const {data} = event;
    if (data.command === "onDidSelectFolder") {
      /**
       * data: {
       *  command: string;
       *  path: string;
       *  type: string;
       * }
       */
      if (data.type === "source") {
        setEditingSourcePath(data.path);
      } else if (data.type === "output") {
        setEditingOutputPath(data.path);
      }
    } else if (data.command === "onDidUpdateSourceFolder") {
      /**
       * data: {
       *  command: string;
       *  sourcePaths: string[];
       * }
       */
      dispatch(updateSource(data.sourcePaths));
    }
  }

  useEffect(() => {
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  const getSourceSections = () => {
    if (sources.length === 0) {
      return (
        <VSCodeDataGridRow className="setting-section-grid-row">
          <span><em>No source paths are configured.</em></span>
        </VSCodeDataGridRow>
      );
    } else {
      return sources.map((source, index) => {
        return getSourceRowComponents(source, index);
      });
    }
  };

  const getEditRow = (id: string) => {
    return (
      <VSCodeDataGridRow className="setting-section-grid-row" id={id}  key={id}>
        <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-editable" gridColumn="1">
          <VSCodeTextField
              className="setting-section-grid-text"
              value={editingSourcePath!}
              placeholder="Source Root Path"
              onInput={(e: any) => setEditingSourcePath(e.target.value)}>
            <VSCodeButton slot="end" appearance="icon" title="Browse..." aria-label="Browse..." onClick={() => handleBrowse("source")}>
              <span className="codicon codicon-folder-opened"></span>
            </VSCodeButton>
          </VSCodeTextField>
        </VSCodeDataGridCell>
        <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-editable" gridColumn="2">
          <VSCodeTextField style={{width: "55%"}}
              className="setting-section-grid-text"
              value={editingOutputPath!}
              placeholder="Output Path"
              onInput={(e: any) => setEditingOutputPath(e.target.value)}>
            <VSCodeButton slot="end" appearance="icon" title="Browse..." aria-label="Browse..." onClick={() => handleBrowse("output")}>
              <span className="codicon codicon-folder-opened"></span>
            </VSCodeButton>
          </VSCodeTextField>
          <VSCodeButton className="ml-1" appearance="primary" onClick={() => handleOK()}>OK</VSCodeButton>
          <VSCodeButton className="ml-1" appearance="secondary" onClick={() => handleCancel()}>
            Cancel
          </VSCodeButton>
        </VSCodeDataGridCell>
      </VSCodeDataGridRow>
    )
  };

  const getSourceRowComponents = (source: ClasspathEntry, index: number) => {
    if (editRow === index) {
      return getEditRow(`sources-${index}`);
    } else {
      return (
        <VSCodeDataGridRow className="setting-section-grid-row" id={`sources-${index}`} onMouseEnter={() => setHoveredRow(`sources-${index}`)} onMouseLeave={() => setHoveredRow(null)} key={source.path}>
          <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-left setting-section-grid-cell-readonly" gridColumn="1">
            {source.path}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell className="setting-section-grid-cell setting-section-grid-cell-readonly" gridColumn="2">
            <span>{source.output || defaultOutput}</span>
            <div className={hoveredRow === `sources-${index}` ? "" : "hidden"}>
              <VSCodeButton appearance='icon' onClick={() => handleEdit(source.path, source.output || defaultOutput, index)}>
                <span className="codicon codicon-edit"></span>
              </VSCodeButton>
              <VSCodeButton appearance='icon' onClick={() => handleRemove(source.path)}>
                <span className="codicon codicon-close"></span>
              </VSCodeButton>
            </div>
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      );
    }
  };

  const getAdditionalEditRow = () => {
    if (editRow === null) {
      return null;
    }
    if (editRow < sources.length) {
      return null;
    }
    return getEditRow("sources-additional-editing");
  };

  return (
    <div className="setting-section">
      <div id="list-actions" className="flex-center setting-list-actions">
        <VSCodeButton className="pl-1 pr-1 pt-1 pb-1" slot="end" appearance="icon" onClick={() => handleAdd()}>
          <span className="codicon codicon-add mr-1"></span>
          Add Source Root...
        </VSCodeButton>
      </div>
      <VSCodeDivider className="mb-0"/>
      <div className="setting-overflow-area">
        <VSCodeDataGrid gridTemplateColumns="40% 60%" generateHeader="sticky">
          <VSCodeDataGridRow className="setting-section-grid-row" rowType="header">
            <VSCodeDataGridCell className="setting-section-grid-cell" cellType="columnheader" gridColumn="1">
              <span className="setting-section-grid-row-header">Path</span>
            </VSCodeDataGridCell>
            <VSCodeDataGridCell className="setting-section-grid-cell" cellType="columnheader" gridColumn="2">
              <span className="setting-section-grid-row-header">Output</span>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
          {getSourceSections()}
          {getAdditionalEditRow()}
        </VSCodeDataGrid>
      </div>
      
    </div>
  );
};

export default Sources;
