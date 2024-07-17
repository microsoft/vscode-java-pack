import { TextDocument } from "vscode";
import { JavaProject, JavaProjectContext } from "./JavaProject";
import path from "path";
import { logger } from "../logger";

export class JavaDocument {
    public constructor(public readonly document: TextDocument) { }

    public static async from(document: TextDocument): Promise<JavaDocument> {
        return new JavaDocument(document);
    }
    public async collectContext(options?: { [P in keyof JavaDocumentContext]?: boolean }): Promise<JavaDocumentContext> {
        logger.info('collecting document context info...');
        const project = await JavaProject.ofDocument(this.document);
        const projectContext = await project.collectContext(options);
        const defaultExclude = Object.values(options ?? {}).every(v => v === true);
        const include = (opt: boolean | undefined) => (defaultExclude && opt === true) || (!defaultExclude && opt !== false);
        const imports = include(options?.imports) ? this.getImports() : undefined;
        const documentPath = path.relative(project.root.path, this.document.uri.path);
        return { ...projectContext, imports, path: documentPath };
    }

    public getImports(): string[] {
        const fileContent = this.document.getText();
        const importRegex = /^\s*import\s+([\w.]+);/gm;
        const matches = fileContent.match(importRegex);
        return matches ?? [];
    }
}

export interface JavaDocumentContext extends JavaProjectContext {
    path?: string;
    imports?: string[];
}
