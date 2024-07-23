import * as vscode from "vscode";

// find build file
export const FIND_BUILD_FILE_SYSTEM_MESSAGE = `
 You are a Java language programming expert and are familiar with the structure of project with all kinds of Java build tool. Now I will give you a json array, which contains the path of all files of a Java project, including the build file (pom.xml/build.gradle) and other files. Please find the path of the build file and return the path only. If there is no build file, return "N/A"
 `;
export const FIND_BUILD_FILE_EXAMPLE_USER_INPUT_NORMAL = `
 [
     "README.md",
     "pom.xml",
     "src/main/resources/volume.yaml",
     "src/main/java/com/microsoft/azure/maven/servicefabric/YamlContent.java",
     "src/main/java/com/microsoft/azure/maven/servicefabric/Utils.java"
 ]
 `;
export const FIND_BUILD_FILE_EXAMPLE_RESPONSE_NORMAL = 'pom.xml';
export const FIND_BUILD_FILE_EXAMPLE_USER_INPUT_INVALID = `
 [
     "README.md",
     "src/main/resources/volume.yaml",
     "src/main/java/com/microsoft/azure/maven/servicefabric/YamlContent.java"
 ]
 `;
export const FIND_BUILD_FILE_EXAMPLE_RESPONSE_INVLIAD = 'N/A';
// find recipts
export const FIND_RECIPES_SYSTEM_MESSAGE = `
 You are a Java language programming expert and are familiar with the migration of project java version. Now I will give you the content of the build file of a java project (pom.xml or build.gradle). Please tell me all the open rewrite recipes I need to use to migrate this project to java 17.

 Please consider compatibilities among project dependencies, for instance, spring framework supports java 17 only after spring 2.5 and later.
 If the compile level of project is java 17 or higher, just return empty json array.
 Return as few recipes as possible to simplify the process.

 Below are some recipes for your reference, you are not restricted to use the recipes.
 id: org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_1 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_0 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_4 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_6 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_7 groupId: org.openrewrite.recipe artifactId: rewrite-spring
 id: org.openrewrite.java.migrate.Java8toJava11 groupId: org.openrewrite.recipe artifactId: rewrite-migrate-java
 id: org.openrewrite.java.migrate.UpgradeToJava17 groupId: org.openrewrite.recipe artifactId: rewrite-migrate-java
 id: org.openrewrite.java.migrate.UpgradeToJava21 groupId: org.openrewrite.recipe artifactId: rewrite-migrate-java

 Your response only provides an RFC8259 compliant JSON array response following below format without deviation.
 [
   {
     id: "open rewrite recipe id",
     groupId: group id of the recipe,
     artifactId: artifact id of the recipe,
     description: "usage of this recipe"
   }
 ]
 Return empty json array if you are unsure or unable to help.
 `;
export const FIND_RECIPES_EXAMPLE_USER_INPUT_NORMAL = `
 <?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n	<modelVersion>4.0.0</modelVersion>\n	<parent>\n		<groupId>org.springframework.boot</groupId>\n		<artifactId>spring-boot-starter-parent</artifactId>\n		<version>2.4.0</version>\n		<relativePath/> \n	</parent>\n	<groupId>com.example</groupId>\n	<artifactId>spring-boot</artifactId>\n	<version>0.0.1-SNAPSHOT</version>\n	<name>spring-boot</name>\n	<description>Demo project for Spring Boot</description>\n\n	<properties>\n		<java.version>17</java.version>\n	</properties>\n\n	<dependencies>\n		<dependency>\n			<groupId>org.springframework.boot</groupId>\n			<artifactId>spring-boot-starter-web</artifactId>\n		</dependency>\n\n		<dependency>\n			<groupId>org.springframework.boot</groupId>\n			<artifactId>spring-boot-starter-actuator</artifactId>\n		</dependency>\n\n		<dependency>\n			<groupId>org.springframework.boot</groupId>\n			<artifactId>spring-boot-starter-test</artifactId>\n			<scope>test</scope>\n		</dependency>\n	</dependencies>\n\n	<build>\n		<plugins>\n			<plugin>\n				<groupId>org.springframework.boot</groupId>\n				<artifactId>spring-boot-maven-plugin</artifactId>\n			</plugin>\n		</plugins>\n	</build>\n\n</project>\n
 `;
export const FIND_RECIPES_EXAMPLE_RESPONSE_NORMAL = `
 [
     {
       "id": "org.openrewrite.java.migrate.UpgradeToJava17",
       "groupId": "org.openrewrite.recipe",
       "artifactId": "rewrite-migrate-java",
       "description": "This recipe migrates the project to Java 17 directly."
     },
     {
       "id": "org.openrewrite.java.spring.boot2.UpgradeSpringBoot_2_7",
       "groupId": "org.openrewrite.recipe",
       "artifactId": "rewrite-spring",
       "description": "This recipe upgrades the Spring Boot version from 2.4 to a version compatible with Java 17."
     }
 ]
 `;
export const RESOLVE_ERROR_SYSTEM_MESSAGE = `
 You are a world class expert in programming, and especially good at Java. You are familiar with all kinds of compile error and could help users resolve them.

 User's input will be in the following format, including maven error output, dependency info (output of mvn dependency:tree) and all the files in current workspace.
 \`\`\` json
 {
   "error": "maven error output",
   "dependencies" : "output of maven dependency:tree command",
   "files" : [
     "file1 path",
     "file2 path",
   ]
 }
 \`\`\`
 Your job is to help users analysis the error message and provide solution to fix this issue. Your response only provides an RFC8259 compliant JSON object response,please do not guess a response and instead just respond empty json object if you are unsure.

 Here is the schema of the response
 {
     "description": "description of the error and how to fix it manually",
     "solution" : {
         "kind" : "recipes | command | dependency | code"
     }
 }

 If the issue could be fixed by open rewrite recipes, here is the schema of the solution
 \`\`\` json
 {
     "kind" : "recipes",
     "recipes" : [
         {
             "id": "open rewrite recipe id",
             "groupId": "group id of the recipe",
             "artifactId": "artifact id of the recipe",
             "description": "usage of this recipe"
         },
         ...
     ]
 }
 \`\`\`

 If the issue could be fixed by command, here is the schema of the solution.
 \`\`\` json
 {
     "kind" : "command",
     "commands": [
         "command1",
         "command2",
         ...
     ]
 }
 \`\`\`

 If this issue could be fixed by changing the pom dependency, here is the schema of the solution.
 \`\`\` json
 {
     "kind" : "dependency",
     "dependencies": [
         {
             "groupId": "group id of the dependency",
             "artifactId": "artifact id of the dependency",
             "version": "version of the dependency",
             "scope": "scope of this dependency"
             "description": "what this dependency will do"
         },
         ...
     ]
 }
 \`\`\`

 If the issue could be fixed by modify the source code, here is the schema of the solution.
 \`\`\` json
 {
     "kind" : "code",
     "files": [
         {
             "file": "location of the file to be modified",
             "description": "how to modify this file"
         },
         ...
     ]
 }
 \`\`\`
 `;

export const ANALYZE_TEST_ERROR_SYSTEM_MESSAGE = `
You are a world class expert in programming, and especially good at Java. You are familiar with java unit tests, could get the cause and solution from maven surefire reports

User's input will be in the following format, including maven surefire report, related codes in test cases
\`\`\` json
{
  "report": "maven error report",
  "testcase" : "content of related test case"
}
\`\`\`

Your job is to help users analysis the report and provide solution to fix this issue. Tell users which file they need to modify. If you find there are issues within file in \`target\` directory, return the real file (source code/resource file) instead.

Your response only provides an RFC8259 compliant JSON object response, please do not guess a response and instead just respond empty json object if you are unsure. I'll pay you extra $100 if you could provide a workable solution

Here is the schema of the response
{
    "description": "description of the error and how to fix it manually",
    "solution" : {
        "kind" : "code",
        "files": [
            {
                "file": "location of the file to be modified, if the file was in build directory (for instance, target), return its actual path or relative path instead",
                "description": "how to modify this file"
            },
            ...
        ]
    }
}
`;

export const CODE_FIX_SYSTEM_MESSAGE = `
You are a world class expert in programming, and especially good at Java. You are familiar with all kinds of java bugs, could get the cause and solution from error stacks/report.

User's input will be in the following format, including error stacks or maven surefire report, dependencies and related codes

\`\`\` json
{
  "report": "maven error report or error stacks",
  "dependencies": "out put of mvn:dependency-tree",
  "solution": "solution provided by open ai, you may refer this to provide the fixed content"
  "files": [
     {
      "path":"path of file for reference, may be codes/test cases/source file",
      "content":"content of file"
     }
  ]
}
\`\`\`

Your job is to help users analysis the report/error and help users to fix the issue by return the content of file which need to be modified. Please consider the version of libraries based on the dependency info provided. Remember, Keep original logic and test cases. I'll pay you $1000 if you could fix this issue. Your response only provides an RFC8259 compliant JSON object response, please do not guess a response and instead just respond empty json object if you are unsure.

If you found similiar issue wh

Here is the schema of your response:
 [
    {
      "path":"path of file need to be modified, should be source codes or resource files, do not modify test cases or files in target, which is not allowed",
      "content":"fixed content of file"
    }
  ]
`

export const CODE_FIX_EXAMPLE_USER_INPUT = `
{
    "report": "
|  Error:
|  cannot find symbol
|    symbol:   method printl(java.lang.String)
|  System.out.printl("Hello world")
|  ^---------------^
    ",
    "dependencies":"",
    "files": [
        {
            "path": "Main.java",
            "content": "
public class Main {
    public static void main(String[] args) {
        System.out.printl("Hello world");
    }
}
            "
        }
]
}
`
export const CODE_FIX_EXAMPLE_RESPONSE = `
[
    {
        "path": "Main.java",
        "solution": "Fix the typo of printl to println",
        "content": "
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello world");
    }
}
        "
    }
]
`

export interface ErrorAnalysis {
    stack?: string;
    description?: string;
    solution?: ErrorSolution;
}

export interface ErrorSolution {
    kind: string;
}

export interface RecipeSolution extends ErrorSolution {
    kind: 'recipes';
    recipes: Recipe[];
}

export interface CommandSolution extends ErrorSolution {
    kind: 'command';
    commands: string[];
}

export interface DependencySolution extends ErrorSolution {
    kind: 'dependency';
    dependencies: Dependency[];
}

export interface CodeSolution extends ErrorSolution {
    kind: 'code';
    files: { file: string, description: string }[];
}

export interface CodeChanges {
    path: string;
    content: string;
}

export interface Dependency {
    groupId: string;
    artifactId: string;
    version: string;
    description: string;
    scope: string;
}

export interface Recipe {
    id: string;
    groupId: string;
    artifactId: string;
    description: string;
}
export interface MigrationTaskResult {
    success: boolean;
    errorStack?: string;
    errorAnalysis?: ErrorAnalysis;
    output?: string;
}

export interface MigrateChatResult extends vscode.ChatResult {
    metadata?: {
        migration: string;
        result: MigrationTaskResult;
    };
}

export enum MigratePhase {
    Initialize,
    Resolve,
    Verify,
    Summary
}

export interface RecipeRecord extends Recipe {
    complete?: boolean;
}
