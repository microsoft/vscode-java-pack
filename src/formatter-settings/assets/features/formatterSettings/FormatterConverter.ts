// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SupportedSettings } from "../../../FormatterConstants";

class FormatterConverter {
    public valueConvert(setting: string, value: string): string {
        let valueString: string = value;
        switch (setting) {
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
                valueString = (value === "true") ? "insert" : "do not insert";
                break;
        }
        return valueString;
    }
}

export const formatterConverter: FormatterConverter = new FormatterConverter();