// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SupportedSettings } from "./FormatterConstants";

export namespace FormatterConverter {
    export function webView2ProfileConvert(id: string, value: string | undefined): string | undefined {
        switch (id) {
            case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST:
            case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT:
                switch (value) {
                    case "true":
                        return "insert";
                    case "false":
                        return "do not insert";
                    // We regard an empty string as a valid value and may write it to the profile
                    case "":
                        return "";
                    default:
                        return undefined;
                }
            case SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE:
            case SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE:
                switch (value) {
                    case "never":
                        return "one_line_never";
                    case "if empty":
                        return "one_line_if_empty";
                    case "if at most one item":
                        return "one_line_if_single_item";
                    // We regard an empty string as a valid value and may write it to the profile
                    case "":
                        return "";
                    default:
                        return undefined;
                }
        }
        return value;
    }

    export function profile2WebViewConvert(id: string, value: string | undefined): string | undefined {
        switch (id) {
            case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST:
            case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT:
            case SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT:
                switch (value) {
                    case "insert":
                        return "true";
                    case "do not insert":
                        return "false";
                    // We regard an empty string as a valid value and show it in the webview
                    case "":
                        return "";
                    default:
                        return undefined;
                }
            case SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE:
            case SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE:
                switch (value) {
                    case "one_line_never":
                        return "never";
                    case "one_line_if_empty":
                        return "if empty";
                    case "one_line_if_single_item":
                        return "if at most one item";
                    // We regard an empty string as a valid value and show it in the webview
                    case "":
                        return "";
                    default:
                        return undefined;
                }
            case SupportedSettings.PUT_EMPTY_STATEMENT_ON_NEW_LINE:
            case SupportedSettings.COMMENT_INDENTPARAMETERDESCRIPTION:
            case SupportedSettings.COMMENT_INDENT_PARAMETER_DESCRIPTION:
            case SupportedSettings.COMMENT_FORMATHEADER:
            case SupportedSettings.COMMENT_FORMAT_HEADER:
            case SupportedSettings.COMMENT_FORMATTER_COMMENT:
            case SupportedSettings.COMMENT_FORMATTER_COMMENT_CORE:
            case SupportedSettings.COMMENT_FORMAT_BLOCK_COMMENTS:
            case SupportedSettings.FORMAT_LINE_COMMENTS:
            case SupportedSettings.COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION:
            case SupportedSettings.COMMENT_CLEARBLANKLINES:
            case SupportedSettings.COMMENT_CLEAR_BLANK_LINES:
            case SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT:
            case SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT:
            case SupportedSettings.COMMENT_ON_OFF_TAGS:
            case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS:
                // We regard an empty string as a valid value and show it in the webview
                if (value === "true" || value === "false" || value === "") {
                    return value;
                }
                return undefined;
        }
        return value;
    } 
}
