// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SupportedSettings, JavaFormatterSetting, Catagory, ValueKind } from "../../../FormatterConstants";

export function initializeSupportedSettings(version: number): JavaFormatterSetting[] {
  const settings: JavaFormatterSetting[] = [];

  settings.push({
    id: SupportedSettings.TABULATION_CHAR,
    name: "Tab Policy",
    valueKind: ValueKind.Enum,
    candidates: ["tab", "space"],
    value: "tab",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.TABULATION_SIZE,
    name: "Tab Size",
    valueKind: ValueKind.Number,
    value: "4",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS,
    name: "In control statements",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 6
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT,
    name: "Before 'while' in a 'do' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT,
    name: "Before 'finally' in a 'try' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT,
    name: "Before 'else' in an 'if' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT,
    name: "Before 'catch' in a 'try' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Before closing brace of array initializer",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
    name: "After opening brace of array initializer",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION,
    name: "After annotation",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER,
    name: "After annotation on parameters",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE,
    name: "After annotation on packages",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT,
    name: "After annotation on enum constants",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.PUT_EMPTY_STATEMENT_ON_NEW_LINE,
    name: "Before empty statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION,
    name: "In empty class declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE,
    name: "For class declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE,
    name: "For record declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 19,
  });

  settings.push({
    id: SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE,
    name: "For record constructor",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 19,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY,
    name: "In empty method body",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE,
    name: "For method body",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION,
    name: "In empty enum declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE,
    name: "For enum declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT,
    name: "In empty enum constant",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE,
    name: "For enum constant declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION,
    name: "In empty anonymous type declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE,
    name: "For anonymous type declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION,
    name: "In empty annotation declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE,
    name: "For annotation declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BETWEEN_TYPE_DECLARATIONS,
    name: "Between class declarations",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BETWEEN_IMPORT_GROUPS,
    name: "Between import groups",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_PACKAGE,
    name: "Before package declarations",
    valueKind: ValueKind.Number,
    value: "0",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_IMPORTS,
    name: "Before import declarations",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_MEMBER_TYPE,
    name: "Between member type declarations",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.NUMBER_OF_EMPTY_LINES_TO_PRESERVE,
    name: "Preserve empty lines",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.LINESPLIT,
    name: "Maximum line width",
    valueKind: ValueKind.Number,
    value: "120",
    catagory: Catagory.Wrapping,
    startVersion: 1
  });

  settings.push({
    id: SupportedSettings.COMMENT_LINELENGTH,
    name: "Maximum comment line length",
    valueKind: ValueKind.Number,
    value: "80",
    catagory: Catagory.Comment,
    startVersion: 1,
    deprecatedVersion: 7
  });

  settings.push({
    id: SupportedSettings.COMMENT_LINE_LENGTH,
    name: "Maximum comment line length",
    valueKind: ValueKind.Number,
    value: "80",
    catagory: Catagory.Comment,
    startVersion: 7,
  });

  settings.push({
    id: SupportedSettings.COMMENT_INDENTPARAMETERDESCRIPTION,
    name: "Indent wrapped parameter description",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 1,
    deprecatedVersion: 7,
  });

  settings.push({
    id: SupportedSettings.COMMENT_INDENT_PARAMETER_DESCRIPTION,
    name: "Indent wrapped parameter description",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 7,
  });

  settings.push({
    id: SupportedSettings.COMMENT_FORMATHEADER,
    name: "Enable header comment formatting",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 1,
    deprecatedVersion: 7
  });

  settings.push({
    id: SupportedSettings.COMMENT_FORMAT_HEADER,
    name: "Enable header comment formatting",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 7,
  });

  settings.push({
    id: SupportedSettings.COMMENT_FORMATTER_COMMENT,
    name: "Enable comment formatting",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 1,
    deprecatedVersion: 7,
  });

  settings.push({
    id: SupportedSettings.COMMENT_FORMATTER_COMMENT_CORE,
    name: "Enable comment formatting",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 7,
    deprecatedVersion: 11,
  });

  settings.push({
    id: SupportedSettings.COMMENT_FORMAT_BLOCK_COMMENTS,
    name: "Enable block comment formatting",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 11,
  });

  settings.push({
    id: SupportedSettings.FORMAT_LINE_COMMENTS,
    name: "Enable line comment formatting",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 11,
  });

  settings.push({
    id: SupportedSettings.COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION,
    name: "Count line length from starting position",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 13,
  });

  settings.push({
    id: SupportedSettings.COMMENT_CLEARBLANKLINES,
    name: "Clear blank lines in comment",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 1,
    deprecatedVersion: 7
  });

  settings.push({
    id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES,
    name: "Clear blank lines in comment",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 7,
    deprecatedVersion: 11
  });

  settings.push({
    id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT,
    name: "Remove blank lines in Javadoc",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 11,
  });

  settings.push({
    id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT,
    name: "Remove blank lines in block comment",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 11,
  });

  settings.push({
    id: SupportedSettings.COMMENT_ON_OFF_TAGS,
    name: "Use On/Off tags",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Before closing brace in array initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER,
    name: "Before first initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
    deprecatedVersion: 3,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
    name: "After opening brace in array initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 3,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST,
    name: "After closing parenthesis in cast",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS,
    name: "After closing angle bracket in type",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  const supportedSettings: JavaFormatterSetting[] = [];
  for (const setting of settings) {
    if (setting.startVersion <= version && (!setting.deprecatedVersion || setting.deprecatedVersion > version)) {
      supportedSettings.push(setting);
    }
  }
  return supportedSettings;
}
