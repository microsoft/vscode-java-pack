// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export namespace JavaConstants {
    export const SETTINGS_URL_KEY = "format.settings.url";
    export const SETTINGS_PROFILE_KEY = "format.settings.profile";
    export const EXECUTE_WORKSPACE_COMMAND = "java.execute.workspaceCommand";
    export const OPEN_FORMATTER = "java.open.formatter.settings";
    export const JAVA_FORMATTER_SETTINGS_VERSION = "21";
    export const JAVA_CORE_FORMATTER_ID = "org.eclipse.jdt.core.formatter";
}

export interface JavaFormatterSetting {
    id: string;
    name?: string;
    value: string;
    candidates?: string[];
    catagory: Catagory;
    valueKind?: ValueKind;
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

export enum Catagory {
    Common,
    Whitespace,
    Comment,
    Wrapping,
    Newline,
    Blankline,
    UnSupported
}
export namespace SupportedSettings {

    // Common
    export const TABULATION_SIZE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.tabulation.size`;
    export const TABULATION_CHAR = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.tabulation.char`;
    // Indentation
    export const INDENT_SWITCHSTATEMENTS_COMPARE_TO_SWITCH = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.indent_switchstatements_compare_to_switch`;
    export const CONTINUATION_INDENTATION_FOR_ARRAY_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.continuation_indentation_for_array_initializer`;
    export const CONTINUATION_INDENTATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.continuation_indentation`;
    // WhiteSpace
    // Deprecated Settings
    export const INSERT_SPACE_BEFORE_FIRST_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_space_before_first_initializer`;
    // Active Settings
    export const INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_space_before_closing_brace_in_array_initializer`;
    export const INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_space_after_opening_brace_in_array_initializer`;
    export const INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_space_after_closing_paren_in_cast`;
    export const INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_space_after_closing_angle_bracket_in_type_arguments`;
    // New Lines
    // Deprecated Settings
    export const INSERT_NEW_LINE_IN_CONTROL_STATEMENTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_control_statements`;
    export const INSERT_NEW_LINE_AFTER_ANNOTATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_annotation`;
    export const INSERT_NEW_LINE_AFTER_ANNOTATION_ON_MEMBER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_annotation_on_member`;
    export const INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_type_declaration`;
    export const INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_method_body`;
    export const INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_enum_declaration`;
    export const INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_enum_constant`;
    export const INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_anonymous_type_declaration`;
    export const INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_in_empty_annotation_declaration`;
    // Active Settings
    export const INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_before_while_in_do_statement`;
    export const INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_before_finally_in_try_statement`;
    export const INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_before_else_in_if_statement`;
    export const INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_before_closing_brace_in_array_initializer`;
    export const INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_before_catch_in_try_statement`;
    export const INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_opening_brace_in_array_initializer`;
    export const INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_annotation_on_parameter`;
    export const INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_annotation_on_package`;
    export const INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.insert_new_line_after_annotation_on_enum_constant`;
    export const PUT_EMPTY_STATEMENT_ON_NEW_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.put_empty_statement_on_new_line`;
    export const KEEP_TYPE_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_type_declaration_on_one_line`;
    export const KEEP_RECORD_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_record_declaration_on_one_line`;
    export const KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_record_constructor_on_one_line`;
    export const KEEP_METHOD_BODY_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_method_body_on_one_line`;
    export const KEEP_ENUM_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_enum_declaration_on_one_line`;
    export const KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_enum_constant_declaration_on_one_line`;
    export const KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_anonymous_type_declaration_on_one_line`;
    export const KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.keep_annotation_declaration_on_one_line`;
    // Comments
    // Deprecated Settings
    export const COMMENT_LINELENGTH = "comment_line_length";
    export const COMMENT_INDENTPARAMETERDESCRIPTION = "comment_indent_parameter_description";
    export const COMMENT_FORMATHEADER = "comment_format_header";
    export const COMMENT_CLEARBLANKLINES = "comment_clear_blank_lines";
    export const COMMENT_CLEAR_BLANK_LINES = "comment.clear_blank_lines";
    export const COMMENT_FORMATTER_COMMENT = "comment_format_comments";
    export const COMMENT_FORMATTER_COMMENT_CORE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.format_comments`;
    // Current Settings
    export const COMMENT_INDENT_ROOT_TAGS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.indent_root_tags`;
    export const COMMENT_INDENT_PARAMETER_DESCRIPTION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.indent_parameter_description`;
    export const COMMENT_FORMAT_HEADER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.format_header`;
    export const COMMENT_FORMAT_BLOCK_COMMENTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.format_block_comments`;
    export const COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.count_line_length_from_starting_position`;
    export const COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.clear_blank_lines_in_javadoc_comment`;
    export const COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.clear_blank_lines_in_block_comment`;
    export const COMMENT_ALIGN_TAGS_DESCRIPTIONS_GROUPED = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.align_tags_descriptions_grouped`;
    export const COMMENT_LINE_LENGTH = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.line_length`;
    export const COMMENT_ON_OFF_TAGS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.use_on_off_tags`;
    export const FORMAT_LINE_COMMENTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.comment.format_line_comments`;
    // Blank Lines
    export const BLANK_LINES_BETWEEN_TYPE_DECLARATIONS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.blank_lines_between_type_declarations`;
    export const BLANK_LINES_BETWEEN_IMPORT_GROUPS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.blank_lines_between_import_groups`;
    export const BLANK_LINES_BEFORE_PACKAGE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.blank_lines_before_package`;
    export const BLANK_LINES_BEFORE_MEMBER_TYPE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.blank_lines_before_member_type`;
    export const BLANK_LINES_BEFORE_IMPORTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.blank_lines_before_imports`;
    export const NUMBER_OF_EMPTY_LINES_TO_PRESERVE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.number_of_empty_lines_to_preserve`;
    // Wrapping
    export const LINESPLIT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.lineSplit`;
    export const ALIGNMENT_FOR_TYPE_PARAMETERS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_type_parameters`;
    export const ALIGNMENT_FOR_TYPE_ARGUMENTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_type_arguments`;
    export const ALIGNMENT_FOR_RESOURCES_IN_TRY = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_resources_in_try`;
    export const ALIGNMENT_FOR_PARAMETERIZED_TYPE_REFERENCES = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_parameterized_type_references`;
    export const ALIGNMENT_FOR_METHOD_DECLARATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_method_declaration`;
    export const ALIGNMENT_FOR_EXPRESSIONS_IN_FOR_LOOP_HEADER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_expressions_in_for_loop_header`;
    export const ALIGNMENT_FOR_ENUM_CONSTANTS = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_enum_constants`;
    export const ALIGNMENT_FOR_CONDITIONAL_EXPRESSION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_conditional_expression`;
    export const ALIGNMENT_FOR_ASSIGNMENT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_assignment`;
    export const ALIGNMENT_FOR_ASSERTION_MESSAGE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_assertion_message`;
    export const ALIGNMENT_FOR_ARGUMENTS_IN_ANNOTATION = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_arguments_in_annotation`;
    export const ALIGNMENT_FOR_ANNOTATIONS_ON_PARAMETER = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_annotations_on_parameter`;
    export const ALIGNMENT_FOR_ANNOTATIONS_ON_PACKAGE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_annotations_on_package`;
    export const ALIGNMENT_FOR_ANNOTATIONS_ON_ENUM_CONSTANT = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.alignment_for_annotations_on_enum_constant`;

    export const commonSettings: string[] = [
        TABULATION_SIZE,
        TABULATION_CHAR
    ];

    export const indentationSettings: string[] = [
        INDENT_SWITCHSTATEMENTS_COMPARE_TO_SWITCH,
        CONTINUATION_INDENTATION_FOR_ARRAY_INITIALIZER,
        CONTINUATION_INDENTATION
    ];

    export const whitespaceSettings: string[] = [
        INSERT_SPACE_BEFORE_FIRST_INITIALIZER,
        INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
        INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
        INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST,
        INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS
    ];

    export const newlineSettings: string[] = [
        INSERT_NEW_LINE_IN_CONTROL_STATEMENTS,
        INSERT_NEW_LINE_AFTER_ANNOTATION,
        INSERT_NEW_LINE_AFTER_ANNOTATION_ON_MEMBER,
        INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION,
        INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY,
        INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION,
        INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT,
        INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION,
        INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION,
        INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT,
        INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT,
        INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT,
        INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
        INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT,
        INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
        INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER,
        INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE,
        INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT,
        PUT_EMPTY_STATEMENT_ON_NEW_LINE,
        KEEP_TYPE_DECLARATION_ON_ONE_LINE,
        KEEP_RECORD_DECLARATION_ON_ONE_LINE,
        KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE,
        KEEP_METHOD_BODY_ON_ONE_LINE,
        KEEP_ENUM_DECLARATION_ON_ONE_LINE,
        KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE,
        KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE,
        KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE,
    ];

    export const commentsSettings: string[] = [
        COMMENT_LINELENGTH,
        COMMENT_INDENTPARAMETERDESCRIPTION,
        COMMENT_FORMATHEADER,
        COMMENT_CLEARBLANKLINES,
        COMMENT_CLEAR_BLANK_LINES,
        COMMENT_FORMATTER_COMMENT,
        COMMENT_FORMATTER_COMMENT_CORE,
        COMMENT_INDENT_ROOT_TAGS,
        COMMENT_INDENT_PARAMETER_DESCRIPTION,
        COMMENT_FORMAT_HEADER,
        COMMENT_FORMAT_BLOCK_COMMENTS,
        FORMAT_LINE_COMMENTS,
        COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION,
        COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT,
        COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT,
        COMMENT_ALIGN_TAGS_DESCRIPTIONS_GROUPED,
        COMMENT_LINE_LENGTH,
        COMMENT_ON_OFF_TAGS,
    ];

    export const blanklinesSettings: string[] = [
        BLANK_LINES_BETWEEN_TYPE_DECLARATIONS,
        BLANK_LINES_BETWEEN_IMPORT_GROUPS,
        BLANK_LINES_BEFORE_PACKAGE,
        BLANK_LINES_BEFORE_MEMBER_TYPE,
        BLANK_LINES_BEFORE_IMPORTS,
        NUMBER_OF_EMPTY_LINES_TO_PRESERVE,
    ];

    export const wrappingSettings: string[] = [
        LINESPLIT,
        ALIGNMENT_FOR_TYPE_PARAMETERS,
        ALIGNMENT_FOR_TYPE_ARGUMENTS,
        ALIGNMENT_FOR_RESOURCES_IN_TRY,
        ALIGNMENT_FOR_PARAMETERIZED_TYPE_REFERENCES,
        ALIGNMENT_FOR_METHOD_DECLARATION,
        ALIGNMENT_FOR_EXPRESSIONS_IN_FOR_LOOP_HEADER,
        ALIGNMENT_FOR_ENUM_CONSTANTS,
        ALIGNMENT_FOR_CONDITIONAL_EXPRESSION,
        ALIGNMENT_FOR_ASSIGNMENT,
        ALIGNMENT_FOR_ASSERTION_MESSAGE,
        ALIGNMENT_FOR_ARGUMENTS_IN_ANNOTATION,
        ALIGNMENT_FOR_ANNOTATIONS_ON_PARAMETER,
        ALIGNMENT_FOR_ANNOTATIONS_ON_PACKAGE,
        ALIGNMENT_FOR_ANNOTATIONS_ON_ENUM_CONSTANT,
    ];

    export const settings: string[] = [
        // Common settings inherit from VS Code, so we will not change them in the profile
        ...indentationSettings,
        ...whitespaceSettings,
        ...newlineSettings,
        ...commentsSettings,
        ...blanklinesSettings,
        ...wrappingSettings
    ];
}

export namespace PreviewExample {

    export const COMMON_EXAMPLE = "package com.example;\n" +
        "\n" +
        "class Example {\n" +
        "    int[] myArray = { 1, 2, 3, 4, 5, 6 };\n" +
        "    String stringWithTabs = \"1	2	3	4\";\n" +
        "    String textBlock = \"\"\"\n" +
        "first line\n" +
        "\n" +
        "second line\n" +
        "\"\"\";\n" +
        "}\n";

    export const BLANKLINE_EXAMPLE = "package com.example;\n" +
        "\n" +
        "import java.util.List;\n" +
        "import java.util.Arrays;\n" +
        "\n" +
        "import org.eclipse.jdt.core.dom.ASTParser;\n" +
        "\n" +
        "public class Example {\n" +
        "    public interface ExampleProvider {\n" +
        "        Example getExample();\n" +
        "        // Between here...\n" +
        "\n" +
        "\n" +
        "\n" +
        "        // and here are 3 blank lines\n" +
        "        List<Example> getManyExamples();\n" +
        "    }\n" +
        "\n" +
        "    public class Foo {\n" +
        "        int a;\n" +
        "    }\n" +
        "}\n" +
        "class Another {\n" +
        "\n" +
        "}\n";

    export const COMMENT_EXAMPLE = "/**\n" +
        "* An example for comment formatting. This example is meant to illustrate the various possibilities offered by Eclipse in order to format comments\n" +
        "*/\n" +
        "package mypackage;\n" +
        "\n" +
        "interface Example {\n" +
        "    /*\n" +
        "     *\n" +
        "     *block comment          on first column\n" +
        "     */\n" +
        "    int bar();\n" +
        "\n" +
        "    /**\n" +
        "     *\n" +
        "     *\n" +
        "     *\n" +
        "     * Descriptions of parameters and return values are best appended at end of the javadoc comment.\n" +
        "     * @param first The first parameter. For an optimum result, this should be an odd number between 0 and 100.\n" +
        "     * @param second The second parameter.\n" +
        "     * @return The result of the foo operation, usually an even number within 0 and 1000.\n" +
        "     */ int foo(int first, int second);\n" +
        "// This is a long comment that should be split in multiple line comments in case the line comment formatting is enabled\n" +
        "     int foo2();\n" +
        "     // @formatter:off\n" +
        "     void method2(int     a,   int   b);\n" +
        "     // @formatter:on\n" +
        "}\n";

    export const NEWLINE_EXAMPLE = "@Deprecated package com.example;\n" +
        "class Example {\n" +
        "    static int [] fArray= {1, 2, 3, 4, 5 };\n" +
        // eslint-disable-next-line @typescript-eslint/quotes
        `    void bar(@SuppressWarnings("unused") int i) {\n` +
        "        do { } while (true);\n" +
        "        try { } catch (Exception e) { } finally { }\n" +
        "        if (true) { return; } else if (false) { return; }\n" +
        "        ;;\n" +
        "    }\n" +
        "}\n" +
        "enum MyEnum {    @Deprecated UNDEFINED(0) { }}\n";

    export const WHITESPACE_EXAMPLE = "package example;\n" +
        "class Example {\n" +
        "public int[] array1 = new int[]{ 1, 2, 3 };\n" +
        "public String s = ((String)object);\n" +
        "public void foo(){\n" +
        "x.<String, Element>foo();\n" +
        "}\n" +
        "}\n";

    export const WRAPPING_EXAMPLE = "public class Example {\n" +
        "\n" +
        "    public List<Integer> list = Arrays.asList(\n" +
        "        111111, 222222, 333333,\n" +
        "        444444, 555555, 666666,\n" +
        "        777777, 888888, 999999, 000000);\n" +
        "}\n";

}