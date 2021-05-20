// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
export interface JavaFormatterSetting {
    id: string;
    name: string;
    value: string;
    candidates?: string[];
    category: Category;
    exampleKind: ExampleKind;
    valueKind: ValueKind;
    // the first profile version the setting becomes valid, default is 1.
    startVersion: number;
    // the first profile version the settings becomes deprecated, if undefined, the setting is valid in the current version.
    deprecatedVersion?: number;
}

export enum ValueKind {
    Boolean,
    Number,
    Enum,
}

export enum Category {
    Indentation,
    Whitespace,
    Comment,
    Wrapping,
    InsertLine,
    BlankLine,
}

export enum ExampleKind {
    INDENTATION_EXAMPLE,
    BLANKLINE_EXAMPLE,
    COMMENT_EXAMPLE,
    INSERTLINE_EXAMPLE,
    BRACED_CODE_TYPE_EXAMPLE,
    BRACED_CODE_RECORD_EXAMPLE,
    BRACED_CODE_ENUM_EXAMPLE,
    ANNOTATION_AND_ANONYMOUS_EXAMPLE,
    WHITESPACE_EXAMPLE,
    WRAPPING_EXAMPLE,
}

// two extra properties from xmldom package, see https://www.npmjs.com/package/xmldom
export interface DOMElement extends Element {
    lineNumber: number;
    columnNumber: number;
}

export interface DOMAttr extends Attr {
    lineNumber: number;
    columnNumber: number;
}

export interface ProfileContent {
    settingsVersion: string,
    diagnostics: vscode.Diagnostic[],
    profileElements?: Map<string, DOMElement>,
    profileSettings?: Map<string, string>,
    lastElement?: DOMElement,
    supportedProfileSettings?: Map<string, JavaFormatterSetting>
}
