// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as l10n from "@vscode/l10n";
import { SupportedSettings, VSCodeSettings } from "../FormatterConstants";
import { ExampleKind, JavaFormatterSetting } from "../types";

export function formatterSettingLabel(setting: JavaFormatterSetting): string {
    switch (setting.id) {
        case SupportedSettings.TABULATION_CHAR: return l10n.t("Indentation policy");
        case SupportedSettings.TABULATION_SIZE: return l10n.t("Tab size");
        case VSCodeSettings.DETECT_INDENTATION: return l10n.t("Detect indentation from file content");
        case SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS: return l10n.t("In control statements");
        case SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT: return l10n.t("Before 'while' in a 'do' statement");
        case SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT: return l10n.t("Before 'finally' in a 'try' statement");
        case SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT: return l10n.t("Before 'else' in an 'if' statement");
        case SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT: return l10n.t("Before 'catch' in a 'try' statement");
        case SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER: return l10n.t("Before closing brace in array initializer");
        case SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER: return l10n.t("After opening brace in array initializer");
        case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION: return l10n.t("After annotation");
        case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER: return l10n.t("After annotation on parameters");
        case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE: return l10n.t("After annotation on packages");
        case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT: return l10n.t("After annotation on enum constants");
        case SupportedSettings.PUT_EMPTY_STATEMENT_ON_NEW_LINE: return l10n.t("Before empty statement");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION: return l10n.t("In empty class declaration");
        case SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for class declaration");
        case SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for record declaration");
        case SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE: return l10n.t("Reserve line for record constructor");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY: return l10n.t("In empty method body");
        case SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE: return l10n.t("Reserve line for method body");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION: return l10n.t("In empty enum declaration");
        case SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for enum declaration");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT: return l10n.t("In empty enum constant");
        case SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for enum constant declaration");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION: return l10n.t("In empty anonymous type declaration");
        case SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for anonymous type declaration");
        case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION: return l10n.t("In empty annotation declaration");
        case SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE: return l10n.t("Reserve line for annotation declaration");
        case SupportedSettings.BLANK_LINES_BETWEEN_TYPE_DECLARATIONS: return l10n.t("Between class declarations");
        case SupportedSettings.BLANK_LINES_BETWEEN_IMPORT_GROUPS: return l10n.t("Between import groups");
        case SupportedSettings.BLANK_LINES_BEFORE_PACKAGE: return l10n.t("Before package declarations");
        case SupportedSettings.BLANK_LINES_BEFORE_IMPORTS: return l10n.t("Before import declarations");
        case SupportedSettings.BLANK_LINES_BEFORE_MEMBER_TYPE: return l10n.t("Between member type declarations");
        case SupportedSettings.NUMBER_OF_EMPTY_LINES_TO_PRESERVE: return l10n.t("Empty lines to preserve");
        case SupportedSettings.LINESPLIT: return l10n.t("Maximum line width");
        case SupportedSettings.COMMENT_LINELENGTH: return l10n.t("Maximum comment line length");
        case SupportedSettings.COMMENT_LINE_LENGTH: return l10n.t("Maximum comment line length");
        case SupportedSettings.COMMENT_INDENTPARAMETERDESCRIPTION: return l10n.t("Indent wrapped parameter description");
        case SupportedSettings.COMMENT_INDENT_PARAMETER_DESCRIPTION: return l10n.t("Indent wrapped parameter description");
        case SupportedSettings.COMMENT_FORMATHEADER: return l10n.t("Enable header comment formatting");
        case SupportedSettings.COMMENT_FORMAT_HEADER: return l10n.t("Enable header comment formatting");
        case SupportedSettings.COMMENT_FORMATTER_COMMENT: return l10n.t("Enable comment formatting");
        case SupportedSettings.COMMENT_FORMATTER_COMMENT_CORE: return l10n.t("Enable comment formatting");
        case SupportedSettings.COMMENT_FORMAT_BLOCK_COMMENTS: return l10n.t("Enable block comment formatting");
        case SupportedSettings.FORMAT_LINE_COMMENTS: return l10n.t("Enable line comment formatting");
        case SupportedSettings.COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION: return l10n.t("Count line length from starting position");
        case SupportedSettings.COMMENT_CLEARBLANKLINES: return l10n.t("Remove blank lines in comment");
        case SupportedSettings.COMMENT_CLEAR_BLANK_LINES: return l10n.t("Remove blank lines in comment");
        case SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT: return l10n.t("Remove blank lines in Javadoc");
        case SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT: return l10n.t("Remove blank lines in block comment");
        case SupportedSettings.COMMENT_ON_OFF_TAGS: return l10n.t("Use On/Off tags");
        case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER: return l10n.t("Before closing brace in array initializer");
        case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER: return l10n.t("Before first initializer");
        case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER: return l10n.t("After opening brace in array initializer");
        case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST: return l10n.t("After closing parenthesis in cast");
        case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS: return l10n.t("After closing angle bracket in type");
        default: return setting.name;
    }
}

export function formatterCandidateLabel(candidate: string): string {
    switch (candidate) {
        case "tab": return l10n.t("tab");
        case "space": return l10n.t("space");
        case "never": return l10n.t("never");
        case "if empty": return l10n.t("if empty");
        case "if at most one item": return l10n.t("if at most one item");
        default: return candidate;
    }
}

export function formatterExampleLabel(kind: ExampleKind): string {
    switch (kind) {
        case ExampleKind.INDENTATION_EXAMPLE: return l10n.t("Indentation");
        case ExampleKind.BLANKLINE_EXAMPLE: return l10n.t("Blank line");
        case ExampleKind.COMMENT_EXAMPLE: return l10n.t("Comment");
        case ExampleKind.INSERTLINE_EXAMPLE: return l10n.t("Insert Line");
        case ExampleKind.BRACED_CODE_TYPE_EXAMPLE: return l10n.t("Braced type");
        case ExampleKind.BRACED_CODE_RECORD_EXAMPLE: return l10n.t("Braced record");
        case ExampleKind.BRACED_CODE_ENUM_EXAMPLE: return l10n.t("Braced enum");
        case ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE: return l10n.t("Annotation and anonymous");
        case ExampleKind.WHITESPACE_EXAMPLE: return l10n.t("Whitespace");
        case ExampleKind.WRAPPING_EXAMPLE: return l10n.t("Wrapping");
    }
}
