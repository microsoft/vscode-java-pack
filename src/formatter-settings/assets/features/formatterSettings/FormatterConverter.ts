// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SupportedSettings } from "../../../FormatterConstants";

class FormatterConverter {
    public webView2ProfileConvert(id: string, value: string): string {
        let returnValue: string = value;
        switch (id) {
            case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST:
            case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_MEMBER:
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
                if (value === "true") {
                    returnValue = "insert";
                } else if (value === "false") {
                    returnValue = "do not insert";
                }
                break;
            case SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE:
            case SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE:
                if (value === "never") {
                    returnValue = "one_line_never";
                } else if (value === "if empty") {
                    returnValue = "one_line_if_empty";
                } else if (value === "if at most one item") {
                    returnValue = "one_line_if_single_item";
                }
                break;
        }
        return returnValue;
    }

    public profile2WebViewConvert(id: string, value: string): string {
        let returnValue: string = value;
        switch (id) {
            case SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS:
            case SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST:
            case SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER:
            case SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION:
            case SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_MEMBER:
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
                if (value === "insert") {
                    returnValue = "true";
                } else if (value === "do not insert") {
                    returnValue = "false";
                }
                break;
            case SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE:
            case SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE:
            case SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE:
                if (value === "one_line_never") {
                    returnValue = "never";
                } else if (value === "one_line_if_empty") {
                    returnValue = "if empty";
                } else if (value === "one_line_if_single_item") {
                    returnValue = "if at most one item";
                }
                break;
        }
        return returnValue;
    } 
}

export const formatterConverter: FormatterConverter = new FormatterConverter();
