import Copilot from "../Copilot";
import { JavaProject, JavaProjectContext } from "./JavaProject";
import * as vscode from "vscode";

export default class ContextCopilot extends Copilot {
    public static readonly DEFAULT_MODEL = { family: 'gpt-3.5-turbo' };
    public static readonly FORMAT_BUILDCONFIG = (buildToolType: string, buildToolConfig: string) => `
    this is the content of ${buildToolType} config file: 
    \`\`\`
    ${buildToolConfig}
    \`\`\`
    `;
    public static readonly FORMAT_LAYOUT = (layout: string) => `
    this is the layout of the project files structure layout: 
    \`\`\`plaintext
    ${layout}
    \`\`\`
    `;

    public static readonly SYSTEM_MESSAGE = `
    **You are Java expert, You are tasked to summarize key characteristics of a project.** based on the given project file structure 
    layout and the content of the project build tool's configuration file if provided. Some possible useful characteristics:
    - appType: The type of the project, e.g., Web App, Android App, Serverless App, Utility Library, IntelliJ Plugin, Maven plugin, Gradle plugin, etc.
    - javaVersion: The version of Java used in the project, e.g., Java 8, Java 11, Java 17, etc.
    - hosts: The host where the project will or can be deployed, e.g., AWS Lambda, GCP, Azure Functions, Docker, Kubernetes, Heroku, etc.
    - buildTools: Used build tools, e.g., Maven, Gradle, Ant, etc.
    - frameworks: Frameworks (including test frameworks) used by the project, e.g., Spring Boot, JUnit, Quarkus, Mockito, Jakarta EE, etc.
    - utilities: Main 3rd party utility libraries used by the project, e.g., Lombok, Guava, Jackson, Apache Commons, Caffeine, etc.
    - databases: Databases used by the project, e.g., MySQL, PostgreSQL, MongoDB, Redis, etc.
    - Any other important characteristics you think it has.
    
    These information will be used to assist GitHub Copilot to generate as accurate code as possible. Please summarize the characteristics of the project 
    with short explanations in an RFC8259 compliant JSON object, follow the following format strictly:
    \`\`\`json
    {
        "characteristic name": {
            value: "corresponding value of the characteristic this project has",
            explanation: "short explanation why you think this project has this characteristic"
        }    
        ...
    }
    \`\`\`
    e.g.,
    \`\`\`json
    {
        "buildTools": {
            value: "Maven, Gradle",
            explanation: "The project has both 'pom.xml' and 'build.gradle' file."
        },
        "frameworks": {
            value: "Spring Boot",
            explanation: "The project has 'application.properties' file in 'src/main/resources' directory."
        },
        ...<other characteristics you think it has and explanation>...
    }
    - Remove characteristics that are unknown, unsure, not applicable or not specified from your response.
    - Don't include that characteristic in your response if you're unable to infer a particular characteristic
    - return the json object only and nothing else, no additional text or comments.
    - Avoid wrapping the response in triple backticks.
    - Always conclude your response with "//${Copilot.DEFAULT_END_MARK}" to indicate the end of your response.
    `;

    public constructor(model: vscode.LanguageModelChat) {
        super(model, [vscode.LanguageModelChatMessage.User(ContextCopilot.SYSTEM_MESSAGE)]);
    }

    public async collectContext(token: vscode.CancellationToken, document?: vscode.TextDocument): Promise<JavaProjectContext> {
        document = document ?? vscode.window.activeTextEditor?.document ?? vscode.workspace.textDocuments[0];
        if (document) {
            const project = await JavaProject.ofDocument(document);
            const layout = await project.getLayout();
            const rawResponse = await this.send([
                vscode.LanguageModelChatMessage.User(ContextCopilot.FORMAT_LAYOUT(layout)),
            ], Copilot.DEFAULT_MODEL_OPTIONS, token);
            return JSON.parse(rawResponse);
        }
        return {};
    }
}