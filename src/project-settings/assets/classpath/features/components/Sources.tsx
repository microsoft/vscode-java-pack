// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import "@vscode-elements/elements/dist/vscode-button/index.js";
import "@vscode-elements/elements/dist/vscode-textfield/index.js";
import "@vscode-elements/elements/dist/vscode-divider/index.js";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch } from "@reduxjs/toolkit";
import { updateSource } from "../classpathConfigurationViewSlice";
import { ClasspathRequest } from "../../../vscode/utils";

import { ClasspathEntry, ClasspathEntryKind } from "../../../../types";

const Sources = (): JSX.Element => {

  const activeProjectIndex: number = useSelector((state: any) => state.commonConfig.ui.activeProjectIndex);
  const activeProjectIndexRef = useRef(activeProjectIndex);
  useEffect(() => {
    activeProjectIndexRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  const sources: ClasspathEntry[] = useSelector((state: any) => state.classpathConfig.data.sources[activeProjectIndex]);
  const defaultOutput: string = useSelector((state: any) => state.classpathConfig.data.output[activeProjectIndex]);

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<number | null>(null);
  const [editingSourcePath, setEditingSourcePath] = useState<string | null>(null);
  const [editingOutputPath, setEditingOutputPath] = useState<string | null>(defaultOutput);

  const sourceInputRef = useRef<HTMLElement>(null);
  const outputInputRef = useRef<HTMLElement>(null);

  const dispatch: Dispatch<any> = useDispatch();

  // Use refs to hold latest editing values so native event listeners can access them
  const editingSourcePathRef = useRef(editingSourcePath);
  const editingOutputPathRef = useRef(editingOutputPath);
  const editRowRef = useRef(editRow);
  useEffect(() => { editingSourcePathRef.current = editingSourcePath; }, [editingSourcePath]);
  useEffect(() => { editingOutputPathRef.current = editingOutputPath; }, [editingOutputPath]);
  useEffect(() => { editRowRef.current = editRow; }, [editRow]);

  // Attach native input events to textfield refs
  useEffect(() => {
    const srcEl = sourceInputRef.current;
    const outEl = outputInputRef.current;
    const onSrcInput = (e: Event) => {
      setEditingSourcePath((e.target as any).value);
    };
    const onOutInput = (e: Event) => {
      setEditingOutputPath((e.target as any).value);
    };
    if (srcEl) srcEl.addEventListener("input", onSrcInput);
    if (outEl) outEl.addEventListener("input", onOutInput);
    return () => {
      if (srcEl) srcEl.removeEventListener("input", onSrcInput);
      if (outEl) outEl.removeEventListener("input", onOutInput);
    };
  }, [editRow]);

  const handleRemove = (path: string) => {
    const updatedSources: ClasspathEntry[] = [];
    for (const sourceRoot of sources) {
      if (sourceRoot.path === path) {
        continue;
      }
      updatedSources.push(sourceRoot);
    }
    dispatch(updateSource({
      activeProjectIndex,
      sources: updatedSources
    }));
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
    const currentSourcePath = editingSourcePathRef.current;
    const currentOutputPath = editingOutputPathRef.current;
    const currentEditRow = editRowRef.current;

    const updatedSources: ClasspathEntry[] = sources.map((source, index) => {
      if (index === currentEditRow && currentSourcePath) {
        return {
          kind: ClasspathEntryKind.Source,
          path: currentSourcePath,
          output: currentOutputPath ?? undefined,
          attributes: source.attributes,
        };
      }
      return source;
    });

    if (currentEditRow === sources.length) {
      updatedSources.push({
        kind: ClasspathEntryKind.Source,
        path: currentSourcePath!,
        output: currentOutputPath ?? undefined,
      });
    }
    dispatch(updateSource({
      activeProjectIndex,
      sources: updatedSources
    }));
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
    ClasspathRequest.onWillSelectFolder(type);
  }

  const messageHandler = useCallback((event: any) => {
    const {data} = event;
    if (data.command === "classpath.onDidSelectFolder") {
      if (data.type === "source") {
        setEditingSourcePath(data.path);
      } else if (data.type === "output") {
        setEditingOutputPath(data.path);
      }
    } else if (data.command === "classpath.onDidUpdateSourceFolder") {
      dispatch(updateSource({
        activeProjectIndex: activeProjectIndexRef.current,
        sources: data.sourcePaths
      }));
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [messageHandler]);

  const renderEditRow = (id: string) => {
    return (
      <div className="source-edit-row" key={id}>
        <div className="source-edit-field">
          <label>Source Path:</label>
          <div className="source-edit-input-group">
            <vscode-textfield
                ref={sourceInputRef}
                className="source-edit-input"
                value={editingSourcePath ?? ""}
                placeholder="Source Root Path">
            </vscode-textfield>
            <vscode-button icon-only title="Browse..." aria-label="Browse..." onClick={() => handleBrowse("source")}>
              <span className="codicon codicon-folder-opened"></span>
            </vscode-button>
          </div>
        </div>
        <div className="source-edit-field">
          <label>Output Path:</label>
          <div className="source-edit-input-group">
            <vscode-textfield
                ref={outputInputRef}
                className="source-edit-input"
                value={editingOutputPath ?? ""}
                placeholder="Output Path">
            </vscode-textfield>
            <vscode-button icon-only title="Browse..." aria-label="Browse..." onClick={() => handleBrowse("output")}>
              <span className="codicon codicon-folder-opened"></span>
            </vscode-button>
          </div>
        </div>
        <div className="source-edit-actions">
          <vscode-button onClick={() => handleOK()}>OK</vscode-button>
          <vscode-button secondary onClick={() => handleCancel()}>Cancel</vscode-button>
        </div>
      </div>
    );
  };

  const renderSourceRow = (source: ClasspathEntry, index: number) => {
    if (editRow === index) {
      return renderEditRow(`sources-${index}`);
    }
    const rowId = `sources-${index}`;
    return (
      <div
        className="source-row"
        key={source.path}
        onMouseEnter={() => setHoveredRow(rowId)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <div className="source-row-path">{source.path}</div>
        <div className="source-row-output">
          <span className="source-row-output-text">{source.output || defaultOutput}</span>
          <div className={`source-row-actions ${hoveredRow === rowId ? "" : "hidden"}`}>
            <vscode-button class="ghost-button" icon-only onClick={() => handleEdit(source.path, source.output || defaultOutput, index)} title="Edit">
              <span className="codicon codicon-edit"></span>
            </vscode-button>
            <vscode-button class="ghost-button" icon-only onClick={() => handleRemove(source.path)} title="Remove">
              <span className="codicon codicon-close"></span>
            </vscode-button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="setting-section">
      <div id="list-actions" className="flex-center setting-list-actions">
        <vscode-button class="ghost-button" onClick={() => handleAdd()}>
          <span className="codicon codicon-add mr-1"></span>
          Add Source Root...
        </vscode-button>
      </div>
      <vscode-divider></vscode-divider>
      <div className="setting-overflow-area">
        <div className="source-list-header">
          <div className="source-list-header-cell">Path</div>
          <div className="source-list-header-cell">Output</div>
        </div>
        {sources.length === 0 ? (
          <div className="source-row"><em>No source paths are configured.</em></div>
        ) : (
          sources.map((source, index) => renderSourceRow(source, index))
        )}
        {editRow !== null && editRow >= sources.length && renderEditRow("sources-additional-editing")}
      </div>
    </div>
  );
};

export default Sources;
