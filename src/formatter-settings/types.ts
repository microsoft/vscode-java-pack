// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

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
    Common,
    Whitespace,
    Comment,
    Wrapping,
    InsertLine,
    BlankLine,
}

export enum ExampleKind {
    COMMON_EXAMPLE,
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
