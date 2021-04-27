// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Category, ExampleKind, JavaFormatterSetting, ValueKind } from "./types";

export namespace JavaConstants {
    export const JAVA_CORE_FORMATTER_ID = "org.eclipse.jdt.core.formatter";
}

export namespace SupportedSettings {
    // Common
    export const TABULATION_SIZE = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.tabulation.size`;
    export const TABULATION_CHAR = `${JavaConstants.JAVA_CORE_FORMATTER_ID}.tabulation.char`;
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
}

export namespace Example {

    export const COMMON_EXAMPLE = "package com.example;\n" +
        "\n" +
        "class Example {\n" +
        "\tint[] myArray = { 1, 2, 3, 4, 5, 6 };\n" +
        "\tString strWithTabs = \"1	2	3	4\";\n" +
        "}\n";

    export const BLANKLINE_EXAMPLE = "package com.example;\n" +
        "\n" +
        "import java.util.List;\n" +
        "import java.util.Arrays;\n" +
        "\n" +
        "import org.eclipse.jdt.core.dom.ASTParser;\n" +
        "\n" +
        "public class Example {\n" +
        "\tpublic interface ExampleProvider {\n" +
        "\t\tExample getExample();\n" +
        "\t\t// Between here...\n" +
        "\n" +
        "\n" +
        "\n" +
        "\t\t// and here are 3 blank lines\n" +
        "\t\tList<Example> getManyExamples();\n" +
        "\t}\n" +
        "\n" +
        "\tpublic class Foo {\n" +
        "\t\tint a;\n" +
        "\t}\n" +
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
        "\t/*\n" +
        "\t *\n" +
        "\t *block comment          on first column\n" +
        "\t */\n" +
        "\tint bar();\n" +
        "\n" +
        "\t/**\n" +
        "\t *\n" +
        "\t *\n" +
        "\t *\n" +
        "\t * Descriptions of parameters and return values are best appended at end of the javadoc comment.\n" +
        "\t * @param first The first parameter. For an optimum result, this should be an odd number between 0 and 100.\n" +
        "\t * @param second The second parameter.\n" +
        "\t * @return The result of the foo operation, usually an even number within 0 and 1000.\n" +
        "\t */ int foo(int first, int second);\n" +
        "// This is a long comment that should be split in multiple line comments in case the line comment formatting is enabled\n" +
        "\t int foo2();\n" +
        "\t // @formatter:off\n" +
        "\t void method2(int     a,   int   b);\n" +
        "\t // @formatter:on\n" +
        "}\n";

    export const INSERTLINE_EXAMPLE = "@Deprecated package com.example;\n" +
        "class Example {\n" +
        "\tstatic int [] fArray= {1, 2, 3, 4, 5 };\n" +
        // eslint-disable-next-line @typescript-eslint/quotes
        `\tvoid bar(@SuppressWarnings("unused") int i) {\n` +
        "\t\tdo { } while (true);\n" +
        "\t\ttry { } catch (Exception e) { } finally { }\n" +
        "\t\tif (true) { return; } else if (false) { return; }\n" +
        "\t\t;;\n" +
        "\t}\n" +
        "}\n" +
        "enum MyEnum {\t@Deprecated UNDEFINED(0) { }}\n";

    export const BRACED_CODE_TYPE_EXAMPLE = "public class EmptyClass {}\n" +
        "public class TinyClass {\n" +
        "\tint a;}\n" +
        "public class SmallClass {int a; String b;\n" +
        "\tpublic void doNoting() {}\n" +
        "\tpublic void doOneThing() { System.out.println();\n" +
        "\t}\n" +
        "\tpublic void doMoreThings() { something = 4; doOneThing(); doOneThing(); }\n" +
        "}\n";

    export const BRACED_CODE_RECORD_EXAMPLE = "public record EmptyRecord(int a, int b) {}\n" +
        "public record TinyRecord(int a, int b) {\n" +
        "\tstatic int field;\n" +
        "}\n" +
        "public record SmallRecord(int a, int b) { static int field1; static int field2; }\n" +
        "public record EmptyCompactConstructor(int a, int b) { public EmptyCompactConstructor {} }\n" +
        "public record TinyCompactConstructor(int a, int b) { public TinyCompactConstructor {\n" +
        "\tthis.a = a;\n" +
        "}}\n" +
        "public record SmallCompactConstructor(int a, int b) { public SmallCompactConstructor { this.a = a; this.b = b; } }\n";

    export const BRACED_CODE_ENUM_EXAMPLE = "public enum EmptyEnum {}\n" +
        "public enum TinyEnum{ A;\n" +
        "}\n" +
        "public enum SmallEnum{ VALUE(0); SmallEnum(int val) {}; }\n" +
        "\n" +
        "public enum EnumConstants {\n" +
        "\tEMPTY {\n" +
        "\t},\n" +
        "\tTINY { int getVal() { return 2; }},\n" +
        "\tSMALL { int val = 3; int getVal() { return 3; }};\n" +
        "\tint getVal() { return 1; }\n" +
        "}\n";

    export const ANNOTATION_AND_ANONYMOUS_EXAMPLE = "public @interface EmptyInterface {}\n" +
        "public @interface TinyInterface {\n" +
        "\tvoid run(); }\n" +
        "public @interface SmallInteface { int toA(); String toB(); }\n" +
        "\n" +
        "public class AnonymousClasses {\n" +
        "\tEmptyClass emptyAnonymous = new EmptyClass() {\n" +
        "\t};\n" +
        "\tTinyClass tinyAnonymous = new TinyClass() { String b; };\n" +
        "\tObject o = new SmallClass() { int a; int getA() { return a; } };\n" +
        "}\n";

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
        "\tpublic List<Integer> list = Arrays.asList(\n" +
        "\t\t111111, 222222, 333333,\n" +
        "\t\t444444, 555555, 666666,\n" +
        "\t\t777777, 888888, 999999, 000000);\n" +
        "}\n";

    export function getExample(example: ExampleKind): string {
        switch (example) {
            case ExampleKind.COMMON_EXAMPLE:
                return Example.COMMON_EXAMPLE;
            case ExampleKind.BLANKLINE_EXAMPLE:
                return Example.BLANKLINE_EXAMPLE;
            case ExampleKind.COMMENT_EXAMPLE:
                return Example.COMMENT_EXAMPLE;
            case ExampleKind.INSERTLINE_EXAMPLE:
                return Example.INSERTLINE_EXAMPLE;
            case ExampleKind.BRACED_CODE_TYPE_EXAMPLE:
                return Example.BRACED_CODE_TYPE_EXAMPLE;
            case ExampleKind.BRACED_CODE_RECORD_EXAMPLE:
                return Example.BRACED_CODE_RECORD_EXAMPLE;
            case ExampleKind.BRACED_CODE_ENUM_EXAMPLE:
                return Example.BRACED_CODE_ENUM_EXAMPLE;
            case ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE:
                return Example.ANNOTATION_AND_ANONYMOUS_EXAMPLE;
            case ExampleKind.WHITESPACE_EXAMPLE:
                return Example.WHITESPACE_EXAMPLE;
            case ExampleKind.WRAPPING_EXAMPLE:
                return Example.WRAPPING_EXAMPLE;
            default:
                return "";
        }
    }
}

export function initializeSupportedVSCodeSettings(): JavaFormatterSetting[] {
    const settings: JavaFormatterSetting[] = [];

    const tabPolicy: JavaFormatterSetting = {
        id: SupportedSettings.TABULATION_CHAR,
        name: "Tab Policy",
        valueKind: ValueKind.Enum,
        candidates: ["tab", "space"],
        value: "tab",
        category: Category.Common,
        exampleKind: ExampleKind.COMMON_EXAMPLE,
        startVersion: 1,
    };

    const tabSize: JavaFormatterSetting = {
        id: SupportedSettings.TABULATION_SIZE,
        name: "Tab Size",
        valueKind: ValueKind.Number,
        value: "4",
        category: Category.Common,
        exampleKind: ExampleKind.COMMON_EXAMPLE,
        startVersion: 1,
    };

    settings.push(tabPolicy, tabSize);
    return settings;
}

export function initializeSupportedProfileSettings(version: number): JavaFormatterSetting[] {
    const settings: JavaFormatterSetting[] = [];

    const insertLineInControlStatements: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_CONTROL_STATEMENTS,
        name: "In control statements",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 6
    };

    const insertLineBeforeWhileInDo: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_BEFORE_WHILE_IN_DO_STATEMENT,
        name: "Before 'while' in a 'do' statement",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 6,
    };

    const insertLineBeforeFinallyInTry: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_BEFORE_FINALLY_IN_TRY_STATEMENT,
        name: "Before 'finally' in a 'try' statement",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 6,
    };

    const insertLineBeforeElseInIf: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_BEFORE_ELSE_IN_IF_STATEMENT,
        name: "Before 'else' in an 'if' statement",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 6,
    };

    const insertLineBeforeCatchInTry: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CATCH_IN_TRY_STATEMENT,
        name: "Before 'catch' in a 'try' statement",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 6,
    };

    const insertLineBeforeClosingBraceinArrayInitializer: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
        name: "Before closing brace in array initializer",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
    };

    const insertLineAfterOpeningBraceInArrayInitializer: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
        name: "After opening brace in array initializer",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
    };

    const insertLineAfterAnnotation: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION,
        name: "After annotation",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 12,
    };

    const insertLineAfterAnnotationOnParameters: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PARAMETER,
        name: "After annotation on parameters",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 12,
    };

    const insertLineAfterAnnotationOnPackages: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_PACKAGE,
        name: "After annotation on packages",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 12,
    };

    const insertLineAfterAnnotationOnEnumConstants: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_AFTER_ANNOTATION_ON_ENUM_CONSTANT,
        name: "After annotation on enum constants",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
    };

    const insertLineBeforeEmptyStatement: JavaFormatterSetting = {
        id: SupportedSettings.PUT_EMPTY_STATEMENT_ON_NEW_LINE,
        name: "Before empty statement",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.InsertLine,
        exampleKind: ExampleKind.INSERTLINE_EXAMPLE,
        startVersion: 1,
    };

    const insertLineInEmptyClassDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_TYPE_DECLARATION,
        name: "In empty class declaration",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_TYPE_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForClassDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_TYPE_DECLARATION_ON_ONE_LINE,
        name: "For class declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_TYPE_EXAMPLE,
        startVersion: 15,
    };

    const insertLinePolicyForRecordDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_RECORD_DECLARATION_ON_ONE_LINE,
        name: "For record declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_RECORD_EXAMPLE,
        startVersion: 19,
    };

    const insertLinePolicyForRecordConstructor: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_RECORD_CONSTRUCTOR_ON_ONE_LINE,
        name: "For record constructor",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_RECORD_EXAMPLE,
        startVersion: 19,
    };

    const insertLineInEmptyMethod: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_METHOD_BODY,
        name: "In empty method body",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_TYPE_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForMethodBody: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_METHOD_BODY_ON_ONE_LINE,
        name: "For method body",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_TYPE_EXAMPLE,
        startVersion: 15,
    };

    const insertLineInEmptyEnumDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_DECLARATION,
        name: "In empty enum declaration",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_ENUM_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForEnumDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_ENUM_DECLARATION_ON_ONE_LINE,
        name: "For enum declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_ENUM_EXAMPLE,
        startVersion: 15,
    };

    const insertLineInEmptyEnumConstant: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ENUM_CONSTANT,
        name: "In empty enum constant",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_ENUM_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForEnumConstantDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_ENUM_CONSTANT_DECLARATION_ON_ONE_LINE,
        name: "For enum constant declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.BRACED_CODE_ENUM_EXAMPLE,
        startVersion: 15,
    };

    const insertLineInEmptyAnonymousTypeDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANONYMOUS_TYPE_DECLARATION,
        name: "In empty anonymous type declaration",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForAnonymousTypeDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_ANONYMOUS_TYPE_DECLARATION_ON_ONE_LINE,
        name: "For anonymous type declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE,
        startVersion: 15
    };

    const insertLineInEmptyAnnotationDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_NEW_LINE_IN_EMPTY_ANNOTATION_DECLARATION,
        name: "In empty annotation declaration",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.InsertLine,
        exampleKind: ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 15,
    };

    const insertLinePolicyForAnnotationDeclaration: JavaFormatterSetting = {
        id: SupportedSettings.KEEP_ANNOTATION_DECLARATION_ON_ONE_LINE,
        name: "For annotation declaration",
        valueKind: ValueKind.Enum,
        candidates: ["never", "if empty", "if at most one item"],
        value: "never",
        category: Category.InsertLine,
        exampleKind: ExampleKind.ANNOTATION_AND_ANONYMOUS_EXAMPLE,
        startVersion: 15,
    };

    const blankLinesBetweenClassDeclarations: JavaFormatterSetting = {
        id: SupportedSettings.BLANK_LINES_BETWEEN_TYPE_DECLARATIONS,
        name: "Between class declarations",
        valueKind: ValueKind.Number,
        value: "1",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const blankLinesBetweenImportGroups: JavaFormatterSetting = {
        id: SupportedSettings.BLANK_LINES_BETWEEN_IMPORT_GROUPS,
        name: "Between import groups",
        valueKind: ValueKind.Number,
        value: "1",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const blankLinesBeforePackageDeclarations: JavaFormatterSetting = {
        id: SupportedSettings.BLANK_LINES_BEFORE_PACKAGE,
        name: "Before package declarations",
        valueKind: ValueKind.Number,
        value: "0",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const blankLinesBeforeImportDeclarations: JavaFormatterSetting = {
        id: SupportedSettings.BLANK_LINES_BEFORE_IMPORTS,
        name: "Before import declarations",
        valueKind: ValueKind.Number,
        value: "1",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const blankLinesBetweenMemberTypeDeclarations: JavaFormatterSetting = {
        id: SupportedSettings.BLANK_LINES_BEFORE_MEMBER_TYPE,
        name: "Between member type declarations",
        valueKind: ValueKind.Number,
        value: "1",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const blankLinesPreserveEmptyLines: JavaFormatterSetting = {
        id: SupportedSettings.NUMBER_OF_EMPTY_LINES_TO_PRESERVE,
        name: "Preserve empty lines",
        valueKind: ValueKind.Number,
        value: "1",
        category: Category.BlankLine,
        exampleKind: ExampleKind.BLANKLINE_EXAMPLE,
        startVersion: 1,
    };

    const maxLineWidth: JavaFormatterSetting = {
        id: SupportedSettings.LINESPLIT,
        name: "Maximum line width",
        valueKind: ValueKind.Number,
        value: "120",
        category: Category.Wrapping,
        exampleKind: ExampleKind.WRAPPING_EXAMPLE,
        startVersion: 1
    };

    const maxCommentLineLength: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_LINELENGTH,
        name: "Maximum comment line length",
        valueKind: ValueKind.Number,
        value: "80",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 7
    };

    const maxCommentLineLengthCurrent: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_LINE_LENGTH,
        name: "Maximum comment line length",
        valueKind: ValueKind.Number,
        value: "80",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 7,
    };

    const indentWrappedParameterDescription: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_INDENTPARAMETERDESCRIPTION,
        name: "Indent wrapped parameter description",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 7,
    };

    const indentWrappedParameterDescriptionCurrent: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_INDENT_PARAMETER_DESCRIPTION,
        name: "Indent wrapped parameter description",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 7,
    };

    const headerCommentFormatting: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_FORMATHEADER,
        name: "Enable header comment formatting",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 7
    };

    const headerCommentFormattingCurrent: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_FORMAT_HEADER,
        name: "Enable header comment formatting",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 7,
    };

    const commentFormatting: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_FORMATTER_COMMENT,
        name: "Enable comment formatting",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 7,
    };

    const commentFormattingSecond: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_FORMATTER_COMMENT_CORE,
        name: "Enable comment formatting",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 7,
        deprecatedVersion: 11,
    };

    const blockCommentFormatting: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_FORMAT_BLOCK_COMMENTS,
        name: "Enable block comment formatting",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 11,
    };

    const lineCommentFormatting: JavaFormatterSetting = {
        id: SupportedSettings.FORMAT_LINE_COMMENTS,
        name: "Enable line comment formatting",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 11,
    };

    const countLineLengthFromStarting: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_COUNT_LINE_LENGTH_FROM_STARTING_POSITION,
        name: "Count line length from starting position",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 13,
    };

    const removeBlankLinesInComment: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_CLEARBLANKLINES,
        name: "Remove blank lines in comment",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 7
    };

    const removeBlankLinesInCommentSecond = {
        id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES,
        name: "Remove blank lines in comment",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 7,
        deprecatedVersion: 11
    };

    const removeBlankLinesInJavadoc: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_JAVADOC_COMMENT,
        name: "Remove blank lines in Javadoc",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 11,
    };

    const removeBlankLinesInBlockComment: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_CLEAR_BLANK_LINES_IN_BLOCK_COMMENT,
        name: "Remove blank lines in block comment",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 11,
    };

    const onOffTags: JavaFormatterSetting = {
        id: SupportedSettings.COMMENT_ON_OFF_TAGS,
        name: "Use On/Off tags",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Comment,
        exampleKind: ExampleKind.COMMENT_EXAMPLE,
        startVersion: 1,
    };

    const whitespaceBeforeClosingBraceInArrayInitializer: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_SPACE_BEFORE_CLOSING_BRACE_IN_ARRAY_INITIALIZER,
        name: "Before closing brace in array initializer",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Whitespace,
        exampleKind: ExampleKind.WHITESPACE_EXAMPLE,
        startVersion: 1,
    };

    const whitespaceBeforeFirstInitializer: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_SPACE_BEFORE_FIRST_INITIALIZER,
        name: "Before first initializer",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Whitespace,
        exampleKind: ExampleKind.WHITESPACE_EXAMPLE,
        startVersion: 1,
        deprecatedVersion: 3,
    };

    const whitespaceAfterOpeningBraceInArrayInitializer: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_SPACE_AFTER_OPENING_BRACE_IN_ARRAY_INITIALIZER,
        name: "After opening brace in array initializer",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Whitespace,
        exampleKind: ExampleKind.WHITESPACE_EXAMPLE,
        startVersion: 3,
    };

    const whitespaceAfterClosingParenthesisInCast: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_PAREN_IN_CAST,
        name: "After closing parenthesis in cast",
        valueKind: ValueKind.Boolean,
        value: "true",
        category: Category.Whitespace,
        exampleKind: ExampleKind.WHITESPACE_EXAMPLE,
        startVersion: 1,
    };

    const whitespaceAfterClosingAngleBracketInType: JavaFormatterSetting = {
        id: SupportedSettings.INSERT_SPACE_AFTER_CLOSING_ANGLE_BRACKET_IN_TYPE_ARGUMENTS,
        name: "After closing angle bracket in type",
        valueKind: ValueKind.Boolean,
        value: "false",
        category: Category.Whitespace,
        exampleKind: ExampleKind.WHITESPACE_EXAMPLE,
        startVersion: 1,
    };

    settings.push(insertLineInControlStatements, insertLineBeforeWhileInDo, insertLineBeforeFinallyInTry,
        insertLineBeforeElseInIf, insertLineBeforeCatchInTry, insertLineBeforeClosingBraceinArrayInitializer,
        insertLineAfterOpeningBraceInArrayInitializer, insertLineAfterAnnotation, insertLineAfterAnnotationOnParameters,
        insertLineAfterAnnotationOnPackages, insertLineAfterAnnotationOnEnumConstants, insertLineBeforeEmptyStatement,
        insertLineInEmptyClassDeclaration, insertLinePolicyForClassDeclaration, insertLinePolicyForRecordDeclaration,
        insertLinePolicyForRecordConstructor, insertLineInEmptyMethod, insertLinePolicyForMethodBody, insertLineInEmptyEnumDeclaration,
        insertLinePolicyForEnumDeclaration, insertLineInEmptyEnumConstant, insertLinePolicyForEnumConstantDeclaration,
        insertLineInEmptyAnonymousTypeDeclaration, insertLinePolicyForAnonymousTypeDeclaration, insertLineInEmptyAnnotationDeclaration,
        insertLinePolicyForAnnotationDeclaration, blankLinesBetweenClassDeclarations, blankLinesBetweenImportGroups,
        blankLinesBeforePackageDeclarations, blankLinesBeforeImportDeclarations, blankLinesBetweenMemberTypeDeclarations,
        blankLinesPreserveEmptyLines, maxLineWidth, maxCommentLineLength, maxCommentLineLengthCurrent, indentWrappedParameterDescription,
        indentWrappedParameterDescriptionCurrent, headerCommentFormatting, headerCommentFormattingCurrent, commentFormatting,
        commentFormattingSecond, blockCommentFormatting, lineCommentFormatting, countLineLengthFromStarting, removeBlankLinesInComment,
        removeBlankLinesInCommentSecond, removeBlankLinesInJavadoc, removeBlankLinesInBlockComment, onOffTags,
        whitespaceBeforeClosingBraceInArrayInitializer, whitespaceBeforeFirstInitializer, whitespaceAfterOpeningBraceInArrayInitializer,
        whitespaceAfterClosingParenthesisInCast, whitespaceAfterClosingAngleBracketInType);

    const supportedSettings: JavaFormatterSetting[] = [];
    for (const setting of settings) {
        if (setting.startVersion <= version && (!setting.deprecatedVersion || setting.deprecatedVersion > version)) {
            supportedSettings.push(setting);
        }
    }
    return supportedSettings;
}
