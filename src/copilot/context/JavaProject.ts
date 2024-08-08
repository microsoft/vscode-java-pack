import { fileExists, retryOnFailure } from "../utils";
import { XMLParser } from "fast-xml-parser";
import ignore from "ignore";
import * as path from 'path';
import * as vscode from "vscode";
import * as fs from 'fs';
import { logger } from "../logger";
import { groupBy } from "lodash";

export class JavaProject {
    public constructor(public readonly root: vscode.Uri) { }

    public static async ofDocument(document: vscode.TextDocument): Promise<JavaProject> {
        const root = await JavaProject.getProjectRoot(document);
        return new JavaProject(root);
    }

    public static async getProjectRoot(document: vscode.TextDocument): Promise<vscode.Uri> {
        try {
            const rootUris: string[] = (await retryOnFailure(async () => {
                return await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll", JSON.stringify({ includeNonJava: false }));
            })) as string[];
            for (const uri of rootUris) {
                const root = vscode.Uri.parse(uri);
                if (document.uri.path.toLowerCase().startsWith(root.path.toLowerCase())) {
                    return root;
                }
            }
            return vscode.Uri.parse(rootUris[0]);
        } catch (e) {
            throw new Error(`Failed to get project root, please check if the project is loaded normally: ${e}`);
        }
    }

    /**
     * 
     * @param options {javaVersion:true} => only get java version, {javaVersion:false} => exclude java version, {javaVersion:true, buildTools:false} => only exclude build tools
     * @returns 
     */
    public async collectContext(options?: { [P in keyof JavaProjectContext]?: boolean }): Promise<JavaProjectContext> {
        logger.info('collecting project context info (java version/libs)...');
        const defaultExclude = Object.values(options ?? {}).every(v => v === true);
        const include = (opt: boolean | undefined) => (defaultExclude && opt === true) || (!defaultExclude && opt !== false);
        const javaVersion = include(options?.javaVersion) ? await this.getJavaVersion() : undefined;
        const buildTools = include(options?.buildTools) ? await this.getBuildTools() : undefined;
        const dependencies = include(options?.dependencies) ? await this.getDependencies() : undefined;
        const layout = include(options?.layout) ? await this.getLayout() : undefined;
        return { javaVersion, buildTools, dependencies, layout };
    }

    public async getBuildTools(): Promise<string[]> {
        const pom = vscode.Uri.joinPath(this.root, 'pom.xml');
        const gradle = vscode.Uri.joinPath(this.root, 'build.gradle');
        const gradleKts = vscode.Uri.joinPath(this.root, 'build.gradle.kts');
        let buildTools: string[] = [];
        if (await fileExists(pom)) {
            buildTools.push('Maven');
        } else if (await fileExists(gradle) || await fileExists(gradleKts)) {
            buildTools.push('Gradle');
        }
        return buildTools;
    }

    public async getJavaVersion(): Promise<string> {
        const key = "org.eclipse.jdt.core.compiler.source";
        try {
            const settings: { [key]: string } = (await retryOnFailure(async () => {
                return await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getSettings", this.root.toString(), [key]);
            })) as { [key]: string };
            return settings[key] ?? '17';
        } catch (e) {
            throw new Error(`Failed to get Java version, please check if the project is loaded normally: ${e}`);
        }
    }

    public async getDependencies(): Promise<Dependency[]> {
        const pom = vscode.Uri.joinPath(this.root, 'pom.xml');
        const gradle = vscode.Uri.joinPath(this.root, 'build.gradle');
        const gradleKts = vscode.Uri.joinPath(this.root, 'build.gradle.kts');
        let dependencies: Dependency[] = [];
        if (await fileExists(pom)) {
            dependencies = await this.getDependenciesFromPom(pom);
        } else if (await fileExists(gradle)) {
            dependencies = await this.getDependenciesFromGradle(gradle);
        } else if (await fileExists(gradleKts)) {
            dependencies = await this.getDependenciesFromGradle(gradleKts);
        }
        // filter out the dependencies that has same groupId and artifactId
        dependencies = dependencies.filter((dep, index, self) => self.findIndex(d => d.groupId === dep.groupId && d.artifactId === dep.artifactId) === index);
        while (dependencies.length > 10) {
            logger.debug('Compressing dependencies...');
            const originalLength = dependencies.length;
            dependencies = this.compressDependencies(dependencies);
            if (originalLength === dependencies.length) {
                break;
            }
            logger.debug(`Compressed dependencies from ${originalLength} to ${dependencies.length}`);
            logger.debug(`\n${Dependency.dependeciesToString(dependencies, ' - ')}`);
        }
        return dependencies;
    }

    public async getLayout(): Promise<string> {
        let layout = `- ${path.basename(this.root.path)}\n`;
        layout += await JavaProject.getFolderLayout(this.root.path, 1);
        return layout;
    }

    public static async getWorkspaceLayout(): Promise<string> {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showInformationMessage('No workspace folders found.');
            throw new Error('No workspace folders found.');
        }

        let layout = '';
        for (const folder of vscode.workspace.workspaceFolders) {
            layout += `- ${folder.name}\n`;
            layout += await JavaProject.getFolderLayout(folder.uri.fsPath, 1);
        }

        return layout;
    }

    private static async getFolderLayout(folderPath: string, depth: number, parentIg = ignore()): Promise<string> {
        const ig = ignore().add(parentIg)
            .add('node_modules').add('bower_components').add('jspm_packages')
            .add('target').add('out').add('build').add('dist').add('bin')
            .add('coverage')
            .add('.gitignore');
        const gitignorePath = path.join(folderPath, '.gitignore');

        // Read and parse .gitignore if it exists in the current directory
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            ig.add(gitignoreContent);
        }
        // List files and directories, excluding those ignored
        const entries = fs.readdirSync(folderPath, { withFileTypes: true })
            .filter(entry => !(entry.isDirectory() && entry.name.startsWith('.')))
            .filter(entry => !ig.ignores(entry.isDirectory() ? `${entry.name}/` : entry.name));

        let markdown = '';
        for (let i = 0; i < entries.length; i++) {
            if (i >= 8 && depth > 1) {
                markdown += `${'  '.repeat(depth)}- ...\n`;
                break;
            }
            const entry = entries[i];
            markdown += `${'  '.repeat(depth)}- ${entry.name}\n`;
            if (entry.isDirectory()) {
                markdown += await this.getFolderLayout(path.join(folderPath, entry.name), depth + 1, ig);
            }
        }

        return markdown;
    }

    private async getDependenciesFromPom(pomFile: vscode.Uri): Promise<Dependency[]> {
        const parser = new XMLParser();
        const content = await vscode.workspace.fs.readFile(pomFile).then((buffer) => buffer.toString());
        const output = parser.parse(content);
        return (output.project.dependencies?.dependency ?? []).map((dep: any) => {
            return { groupId: dep.groupId, artifactId: dep.artifactId, version: dep.version };
        });
    }

    private async getDependenciesFromGradle(gradleFile: vscode.Uri): Promise<Dependency[]> {
        const LOOSE = /group\s*:\s*[\'\"](.*?)[\'\"]\s*,\s*name\s*:\s*[\'\"](.*?)[\'\"]\s*,\s*(version\s*:\s*[\'\"](.*?)[\'\"])?/g;
        const COMPACT = /[\'\"]([^\'\"\s]*?)\:([^\'\"\s]*?)(?:\:([^\'\"\s]*?))?[\'\"]/g;;

        const content = await vscode.workspace.fs.readFile(gradleFile).then((buffer) => buffer.toString());
        let dependencies: Dependency[] = [];
        let dc;
        while (dc = COMPACT.exec(content)) { dependencies.push({ groupId: dc[1], artifactId: dc[2], version: dc[3] }) }
        while (dc = LOOSE.exec(content)) { dependencies.push({ groupId: dc[1], artifactId: dc[2], version: dc[3] }) }
        return dependencies;
    }

    private compressDependencies(deps: Dependency[]): Dependency[] {
        const result: Dependency[] = [];
        const groupedByGroupId = groupBy(deps, (dep) => dep.groupId);
        for (let groupId in groupedByGroupId) {
            const dependenciesWithSameGroupId = groupedByGroupId[groupId];
            if (dependenciesWithSameGroupId.length > 1) { // compress dependencies with same groupId
                const commonArtifactPrefx = this.getLongestCommonPrefix(dependenciesWithSameGroupId.map(dep => dep.artifactId));
                if (commonArtifactPrefx.length > 8) {
                    const uncompressedDependencies = dependenciesWithSameGroupId.filter(dep => !dep.artifactId.startsWith(commonArtifactPrefx))
                    result.push({ groupId: groupId, artifactId: `${commonArtifactPrefx}*` });
                    result.push(...uncompressedDependencies);
                } else {
                    result.push(...dependenciesWithSameGroupId);
                }
            } else {
                result.push(dependenciesWithSameGroupId[0]);
            }
        }
        return result;
    }

    private getLongestCommonPrefix(arr: string[]): string {
        let longestCommonPrefix = '';
        for (let i = 0; i < arr.length - 1; i++) {
            for (let j = i + 1; j < arr.length - 1; j++) {
                let commonPrefix = this.getCommonPrefix(arr[i], arr[j]);
                if (commonPrefix.length > longestCommonPrefix.length) {
                    longestCommonPrefix = commonPrefix;
                }
            }
        }
        return longestCommonPrefix;
    }

    private getCommonPrefix(str1: string, str2: string): string {
        let match = '';
        let len = str1.length < str2.length ? str1.length : str2.length;
        for (let i = 0; i < len; i++) {
            if (str1[i] === str2[i]) {
                match += str1[i];
            } else {
                break;
            }
        }
        return match;
    }
}

export interface JavaProjectContext {
    layout?: string;
    javaVersion?: string;
    buildTools?: string[];
    dependencies?: Dependency[];
    appType?: string;
    host?: string;
    [key: string]: any;
};

export interface Dependency {
    groupId: string;
    artifactId: string;
    version?: string;
}

export namespace Dependency {
    export function dependeciesToString(deps: Dependency[], prefix: string = ''): string {
        return deps.map(dep => `${prefix} '${dependecyToString(dep)}'`).join('\n');
    }

    export function dependecyToString(dep: Dependency): string {
        if (!dep.version || dep.version.includes('$')) {
            return `${dep.groupId}:${dep.artifactId}`;
        } else {
            return `${dep.groupId}:${dep.artifactId}:${dep.version}`;
        }
    }
}

export namespace JavaProjectContext {
    export function toString(context: JavaProjectContext): string {
        let contextStr = "This is a Java project of the following natures:\n";
        if (context.javaVersion) {
            contextStr += ` - Using Java ${context.javaVersion}. I would prefer solutions using the new and more recent features introduced in Java ${context.javaVersion}.\n`;
        }
        if ((context.buildTools?.length ?? 0) > 0) {
            contextStr += ` - Using ${context.buildTools?.join(",")} as build tools.\n`;
        }
        if ((context.dependencies?.length ?? 0) > 0) {
            contextStr += ` - Declared dependencies: \n`;
            context.dependencies?.forEach(dep => contextStr += `   - ${Dependency.dependecyToString(dep)}\n`);
            contextStr += `   (I would prefer solutions provided by these dependency libs. Don't ask me to add these already declared dependencies)\n`;
        }
        if (context.layout) {
            contextStr +=
                ` - this is the layout of the project files structure:
                    \`\`\`plaintext
                    ${context.layout}
                    \`\`\`            
                `;
        }
        if (context.appType) {
            contextStr += ` - It's a ${context.appType} project.\n`;
        }
        if (context.host) {
            contextStr += ` - Will be deployed on ${context.host}.\n`;
        }
        return contextStr;
    }
}
