// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SupportedSettings, JavaFormatterSetting, Catagory, ValueKind } from "../../../FormatterConstants";

export function initializeSupportedSettings(version: number): JavaFormatterSetting[] {
  const settings: JavaFormatterSetting[] = [];

  // Section: common settings
  settings.push({
    id: SupportedSettings.TABULATION_CHAR,
    name: "Controls Tabulation Type",
    valueKind: ValueKind.Enum,
    candidates: ["tab", "space", "mixed"],
    value: "mixed",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.TABULATION_SIZE,
    name: "Controls Tabulation Size",
    valueKind: ValueKind.Number,
    value: "4",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INDENTATION_SIZE,
    name: "Controls Indentation Size",
    valueKind: ValueKind.Number,
    value: "4",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AT_THE_END_OF_FILE_IF_MISSING,
    name: "Keep a new line at the end of file",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Common,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS,
    name: "Insert New Line in control statements",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 6
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT,
    name: "Insert New Line before 'while' in a 'do' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT,
    name: "Insert New Line before 'finally' in a 'try' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT,
    name: "Insert New Line before 'else' in a 'if' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT,
    name: "Insert New Line before 'catch' in a 'try' statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 6,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Insert New Line before closing brace of array initializer",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Insert New Line after opening brace of array initializer",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION,
    name: "Insert New Line after annotation",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER,
    name: "Insert New Line after annotation on parameters",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE,
    name: "Insert New Line after annotation on packages",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 12,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT,
    name: "Insert New Line after annotation on enum constants",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.PUT_EMPTY_STATEMENT_ON_NEW_LINE,
    name: "Insert New Line before empty statement",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Newline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION,
    name: "Insert New Line in empty type declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for class declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for record declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 19,
  });

  settings.push({
    id: SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE,
    name: "New Line policy for record constructor",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 19,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY,
    name: "Insert New Line in empty method body",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE,
    name: "New Line policy for method body",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION,
    name: "Insert New Line in empty enum declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for enum declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT,
    name: "Insert New Line in empty enum constant",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for enum constant declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION,
    name: "Insert New Line in empty anonymous type declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for anonymous type declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15
  });

  settings.push({
    id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION,
    name: "Insert New Line in empty annotation declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Newline,
    startVersion: 1,
    deprecatedVersion: 15,
  });

  settings.push({
    id: SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE,
    name: "New Line policy for annotation declaration",
    valueKind: ValueKind.Enum,
    candidates: ["Never", "If empty", "If at most one item", "If fits in width limit", "Preserve state"],
    value: "Never",
    catagory: Catagory.Newline,
    startVersion: 15,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BETWEEN_TYPE_DECLARATIONS,
    name: "Blank lines between type declarations",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BETWEEN_IMPORT_GROUPS,
    name: "Blank lines between input groups",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_PACKAGE,
    name: "Blank lines before package",
    valueKind: ValueKind.Number,
    value: "0",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_MEMBER_TYPE,
    name: "Blank lines before member type",
    valueKind: ValueKind.Number,
    value: "1",
    catagory: Catagory.Blankline,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.BLANK_LINES_BEFORE_IMPORTS,
    name: "Blank lines before imports",
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
    id: SupportedSettings.COMMENT_FORMAT_BLOCK_COMMENTS,
    name: "Enable block comment formatting",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Comment,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION,
    name: "Count line length from comment's starting position",
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
    id: SupportedSettings.FORMAT_LINE_COMMENT_STARTING_ON_FIRST_COLUMN,
    name: "Format line comments on first column",
    valueKind: ValueKind.Boolean,
    value: "false",
    catagory: Catagory.Comment,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Insert whitespace before closing brace in array initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_BEFORE_AT_IN_ANNOTATION_TYPE_DECLARATION,
    name: "Insert whitespace before @ in annotation type declaration",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER,
    name: "Insert whitespace before first initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
    deprecatedVersion: 3,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
    name: "Insert whitespace after opening brace in array initializer",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 3,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST,
    name: "Insert whitespace after closing parenthesis in cast",
    valueKind: ValueKind.Boolean,
    value: "true",
    catagory: Catagory.Whitespace,
    startVersion: 1,
  });

  settings.push({
    id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS,
    name: "Insert whitespace after closing angle bracket in type arguments",
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
