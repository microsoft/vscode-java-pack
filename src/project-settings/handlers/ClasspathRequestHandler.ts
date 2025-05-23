// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import * as fse from "fs-extra";
import { ClasspathComponent, VmInstall, ClasspathEntry, ClasspathEntryKind } from "../types";
import _ from "lodash";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";
import { getProjectType } from "../../utils/jdt";
import { ProjectType } from "../../utils/webview";

export class ClasspathRequestHandler implements vscode.Disposable {
    private webview: vscode.Webview;
    private currentProjectRoot: vscode.Uri | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(webview: vscode.Webview) {
        this.webview = webview;
        this.webview.onDidReceiveMessage(async (message) => {
            await this.handleClasspathPanelRequest(message);
        });
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
                if (e.affectsConfiguration("java.configuration.runtimes")) {
                    this.debounceListVmInstalls();
                }
            }),
        );
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }

    private async handleClasspathPanelRequest(message: any): Promise<void> {
        switch (message.command) {
            case "classpath.onWillListVmInstalls":
                await this.listVmInstalls();
                break;
            case "classpath.onWillLoadProjectClasspath":
                this.currentProjectRoot = vscode.Uri.parse(message.uri);
                await this.loadProjectClasspath(this.currentProjectRoot);
                break;
            case "classpath.onWillSelectOutputPath":
                await this.selectOutputPath(this.currentProjectRoot);
                break;
            case "classpath.onWillAddSourcePathForUnmanagedFolder":
                await this.addSourcePathForUnmanagedFolder(this.currentProjectRoot);
                break;
            case "classpath.onWillSelectFolder":
                await this.selectFolder(this.currentProjectRoot, message.type);
                break;
            case "classpath.onWillUpdateClassPaths":
                await this.updateClassPaths(message.rootPath, message.projectType, message.sourcePaths, message.defaultOutputPath, message.vmInstallPath, message.libraries);
                break;
            case "classpath.onWillAddNewJdk":
                await this.addNewJdk(this.currentProjectRoot);
                break;
            case "classpath.onWillSelectLibraries":
                await this.selectLibraries(this.currentProjectRoot);
                break;
            case "classpath.onClickGotoProjectConfiguration":
                this.gotoProjectConfigurationFile(message.rootUri, message.projectType);
                break;
            default:
                break;
        }
    }

    private listVmInstalls = instrumentOperation("projectSettings.classpath.listVmInstalls", async (operationId: string) => {
        let vmInstalls: VmInstall[] = await this.getVmInstallsFromLS();
        vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
            return vmA.name.localeCompare(vmB.name);
        });

        if (vmInstalls.length > 0) {
            this.webview.postMessage({
                command: "classpath.onDidListVmInstalls",
                vmInstalls,
            });
        } else {
            sendInfo(operationId, {
                vmNumber: vmInstalls.length,
            });
        }
    });

    private debounceListVmInstalls = _.debounce(this.listVmInstalls, 3000 /*ms*/);

    private loadProjectClasspath = instrumentOperation("projectSettings.classpath.loadClasspath", async (operationId: string, uri: vscode.Uri) => {
        if (!this.currentProjectRoot || path.relative(uri.fsPath, this.currentProjectRoot.fsPath)) {
            return;
        }

        const classpath = await this.getProjectClasspathFromLS(uri);
        if (classpath) {
            this.webview.postMessage({
                command: "classpath.onDidLoadProjectClasspath",
                projectType: classpath.projectType,
                sources: classpath.sourcePaths,
                output: classpath.defaultOutputPath,
                activeVmInstallPath: classpath.jdkPath,
                libraries: classpath.libraries
            });
        }

        sendInfo(operationId, {
            projectType: classpath.projectType,
        });
    });

    public debounceLoadProjectClasspath = _.debounce(this.loadProjectClasspath, 3000 /*ms*/);

    private async selectSourceFolderPath(currentProjectRoot: vscode.Uri): Promise<string | undefined> {
        const sourceFolder: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
            defaultUri: vscode.workspace.workspaceFolders?.[0].uri,
            openLabel: "Select Source Folder",
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        });
        if (sourceFolder) {
            const sourceFolderPath: string = sourceFolder[0].fsPath;
            const projectRootPath: string = currentProjectRoot.fsPath;
            let relativePath: string = path.relative(projectRootPath, sourceFolderPath);
            if (relativePath.startsWith("..")) {
                const err: Error = new Error("The source path must be contained in the project root folder.");
                vscode.window.showErrorMessage(err.message);
                setUserError(err);
                throw (err);
            }
            if (!relativePath) {
                relativePath = ".";
            }
            return relativePath;
        }
        return undefined;
    }

    private addSourcePathForUnmanagedFolder = instrumentOperation("projectSettings.classpath.addSourcePathForUnmanagedFolder", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
        const relativePath: string | undefined = await this.selectSourceFolderPath(currentProjectRoot);
        if (!relativePath) {
            return;
        }
        const sourcePaths: string[] = vscode.workspace.getConfiguration("java", currentProjectRoot).get<string[]>("project.sourcePaths") || [];
        if (sourcePaths.includes(relativePath)) {
            vscode.window.showInformationMessage(`The path ${relativePath} has already been a source path.`);
            return;
        }
        sourcePaths.push(relativePath);
        this.webview.postMessage({
            command: "classpath.onDidUpdateSourceFolder",
            sourcePaths,
        });
    });

    private updateSourcePathsForUnmanagedFolder = instrumentOperation("projectSettings.classpath.updateSourcePathsForUnmanagedFolder", async (_operationId: string, currentProjectRoot: vscode.Uri, sourcePaths: string[]) => {
        vscode.workspace.getConfiguration("java", currentProjectRoot).update(
            "project.sourcePaths",
            sourcePaths,
            vscode.ConfigurationTarget.Workspace,
        );
    });

    private selectFolder = instrumentOperation("projectSettings.classpath.selectFolder", async (_operationId: string, currentProjectRoot: vscode.Uri, type: string) => {
        const relativePath: string | undefined = await this.selectSourceFolderPath(currentProjectRoot);
        if (!relativePath) {
            return;
        }
        this.webview.postMessage({
            command: "classpath.onDidSelectFolder",
            path: relativePath,
            type: type,
        });
    });

    private updateClassPaths = instrumentOperation("projectSettings.classpath.updateClassPaths", async (_operationId: string, rootPath: string, projectType: ProjectType, sourcePaths: ClasspathEntry[], defaultOutputPath: string, vmInstallPath: string, libraries: ClasspathEntry[]) => {
        this.webview.postMessage({
            command: "main.onDidChangeLoadingState",
            loading: true,
        });

        try {
            const currentProjectRoot: vscode.Uri = vscode.Uri.parse(rootPath);
            if (projectType === ProjectType.UnmanagedFolder) {
                this.updateSourcePathsForUnmanagedFolder(currentProjectRoot, sourcePaths.map(sp => sp.path));
                this.setOutputPath(currentProjectRoot, defaultOutputPath);
                this.updateUnmanagedFolderLibraries(libraries.map(l => l.path));
                this.changeJdk(currentProjectRoot, vmInstallPath);
            } else {
                const classpathEntries: ClasspathEntry[] = [];
                classpathEntries.push(...sourcePaths);
                if (vmInstallPath?.length > 0) {
                    classpathEntries.push({
                        kind: ClasspathEntryKind.Container,
                        path: `org.eclipse.jdt.launching.JRE_CONTAINER/${vmInstallPath}`,
                    });
                }
                classpathEntries.push(...libraries);
                if (classpathEntries.length > 0) {
                    await vscode.commands.executeCommand(
                        "java.execute.workspaceCommand",
                        "java.project.updateClassPaths",
                        currentProjectRoot.toString(),
                        JSON.stringify({ classpathEntries }),
                    );
                }
            }
        } catch (error) {
            const err: Error = new Error(`Failed to update classpaths: ${error}`);
            vscode.window.showErrorMessage(err.message, "Open Log Files").then((choice) => {
                if (choice === "Open Log Files") {
                    vscode.commands.executeCommand("java.open.logs");
                }
            });
            setUserError(err);
            sendError(err);
        }

        this.webview.postMessage({
            command: "main.onDidChangeLoadingState",
            loading: false,
        });
    });

    private selectOutputPath = instrumentOperation("projectSettings.classpath.selectOutputPath", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
        const outputFolder: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
            defaultUri: vscode.workspace.workspaceFolders?.[0].uri,
            openLabel: "Select Output Folder",
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        });
        if (outputFolder) {
            const projectRootPath: string = currentProjectRoot.fsPath;
            const outputFullPath: string = outputFolder[0].fsPath;
            const outputRelativePath: string = path.relative(projectRootPath, outputFullPath);
            if (outputRelativePath.startsWith("..")) {
                const err: Error = new Error("The customized output path must be contained in the project root folder.");
                vscode.window.showErrorMessage(err.message);
                setUserError(err);
                throw (err);
            }
            if (!outputRelativePath) {
                const err: Error = new Error("Cannot set the project root path as the output path.");
                vscode.window.showErrorMessage(err.message);
                setUserError(err);
                throw (err);
            }
            this.webview.postMessage({
                command: "classpath.onDidSelectOutputPath",
                output: outputRelativePath,
            });
        }
    });

    private setOutputPath = instrumentOperation("projectSettings.classpath.setOutputPath", async (operationId: string, currentProjectRoot: vscode.Uri, outputRelativePath: string) => {
        if (vscode.workspace.getConfiguration("java", currentProjectRoot).get<string>("project.outputPath") === outputRelativePath) {
            return;
        }

        const outputFullPath = path.join(currentProjectRoot.fsPath, outputRelativePath);
        if ((await fse.readdir(outputFullPath)).length) {
            const choice: string | undefined = await vscode.window.showInformationMessage(`The contents in ${outputFullPath} will be removed, are you sure to continue?`, "Yes", "No");
            if (choice === "Yes") {
                await fse.remove(outputFullPath);
                await fse.ensureDir(outputFullPath);
            } else {
                sendInfo(operationId, {
                    canceled: "Cancelled for un-empty output folder",
                });
                return;
            }
        }
        vscode.workspace.getConfiguration("java", currentProjectRoot).update(
            "project.outputPath",
            outputRelativePath,
            vscode.ConfigurationTarget.Workspace,
        );
    });

    private addNewJdk = instrumentOperation("projectSettings.classpath.addNewJdk", async (operationId: string, currentProjectRoot: vscode.Uri) => {
        const actionResult: Record<string, string> = {
            name: "classpath.configuration",
            kind: "add-new-jdk"
        };
        const javaHome: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
            defaultUri: vscode.workspace.workspaceFolders?.[0].uri,
            openLabel: "Select JDK Home",
            canSelectFiles: false,
            canSelectFolders: true,
            title: "Select the installation path of the JDK"
        });
        if (!javaHome) {
            return;
        }

        // TODO: is there a way to delay the jdk update but register this new jdk to server side?
        const result: IJdkUpdateResult = await vscode.commands.executeCommand<IJdkUpdateResult>(
            "java.execute.workspaceCommand",
            "java.project.updateJdk",
            currentProjectRoot.toString(),
            javaHome[0].fsPath
        );

        actionResult.message1 = result.message;
        actionResult.code = result.success ? "0" : "1";
        sendInfo(operationId, actionResult);

        if (result.success) {
            const activeVmInstallPath = result.message;
            let vmInstalls: VmInstall[] = await this.getVmInstallsFromLS();
            vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
                return vmA.name.localeCompare(vmB.name);
            });
            this.webview.postMessage({
                command: "classpath.onDidChangeJdk",
                activeVmInstallPath,
                vmInstalls,
            });
        } else {
            vscode.window.showErrorMessage(result.message);
            const err: Error = new Error(result.message);
            setUserError(err);
            throw (err);
        }
    });

    private changeJdk = instrumentOperation("projectSettings.classpath.changeJdk", async (operationId: string, currentProjectRoot: vscode.Uri, jdkPath: string) => {
        const actionResult: Record<string, string> = {
            name: "classpath.configuration",
            kind: "use-existing-jdk"
        };
        const result: IJdkUpdateResult = await vscode.commands.executeCommand<IJdkUpdateResult>(
            "java.execute.workspaceCommand",
            "java.project.updateJdk",
            currentProjectRoot.toString(),
            jdkPath
        );

        actionResult.message1 = result.message;
        actionResult.code = result.success ? "0" : "1";
        sendInfo(operationId, actionResult);

        if (result.success) {
            const activeVmInstallPath = result.message;
            let vmInstalls: VmInstall[] = await this.getVmInstallsFromLS();
            vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
                return vmA.name.localeCompare(vmB.name);
            });
            this.webview.postMessage({
                command: "classpath.onDidChangeJdk",
                activeVmInstallPath,
                vmInstalls,
            });
        } else {
            vscode.window.showErrorMessage(result.message);
            const err: Error = new Error(result.message);
            setUserError(err);
            throw (err);
        }
    });

    private selectLibraries = instrumentOperation("projectSettings.classpath.selectLibraries", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
        const jarFiles: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
            defaultUri: vscode.workspace.workspaceFolders?.[0].uri,
            openLabel: "Select Jar File",
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            filters: {
                "Jar": ["jar"],
            },
        });
        if (jarFiles) {
            const jarPaths: string[] = jarFiles.map(uri => {
                if (uri.fsPath.startsWith(currentProjectRoot.fsPath)) {
                    return path.relative(currentProjectRoot.fsPath, uri.fsPath);
                }
                return uri.fsPath;
            });
            this.webview.postMessage({
                command: "classpath.onDidAddLibraries",
                jars: jarPaths.map(jarPath => {
                    return {
                        kind: ClasspathEntryKind.Library,
                        path: jarPath,
                    };
                }),
            });
        }
    });

    private updateUnmanagedFolderLibraries = instrumentOperation("projectSettings.classpath.updateUnmanagedFolderLibraries", async (_operationId: string, jarFilePaths: string[]) => {
        const setting = this.getReferencedLibrariesSetting();
        setting.include = jarFilePaths;
        this.updateReferencedLibraries(setting);
    });

    private gotoProjectConfigurationFile = instrumentOperation("projectSettings.classpath.gotoProjectConfigurationFile", (operationId: string, rootUri: string, projectType: ProjectType) => {
        const rootPath: string = vscode.Uri.parse(rootUri).fsPath;
        let configurationPath: string = "";
        if (projectType === ProjectType.Gradle) {
            configurationPath = path.join(rootPath, "build.gradle");
        } else if (projectType === ProjectType.Maven) {
            configurationPath = path.join(rootPath, "pom.xml");
        }

        if (!configurationPath) {
            const err: Error = new Error(`The configuration file: '${configurationPath}' does not exist.`);
            vscode.window.showErrorMessage(err.message);
            throw (err);
        }
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(configurationPath));
        sendInfo(operationId, {
            projectType,
        });
    });

    private async getVmInstallsFromLS(): Promise<VmInstall[]> {
        const ret: VmInstall[] = [];
        try {
            ret.push(...await vscode.commands.executeCommand<VmInstall[]>("java.execute.workspaceCommand", "java.vm.getAllInstalls") || []);
        } catch (error) {
        }
        return ret;
    }

    private async getProjectClasspathFromLS(uri: vscode.Uri): Promise<ClasspathComponent> {
        const queryKeys: string[] = [
            NATURE_IDS,
            OUTPUT_PATH_KEY,
            VM_LOCATION_KEY,
            CLASSPATH_ENTRIES_KEY,
        ];

        const response: any = await vscode.commands.executeCommand("java.execute.workspaceCommand",
            "java.project.getSettings",
            uri.toString(),
            queryKeys
        );
        const classpath: ClasspathComponent = {
            projectType: getProjectType(uri.fsPath, response[NATURE_IDS] as string[]),
            sourcePaths: await this.getSourceRoots(response[CLASSPATH_ENTRIES_KEY], uri),
            defaultOutputPath: response[OUTPUT_PATH_KEY] as string,
            jdkPath: response[VM_LOCATION_KEY] as string,
            libraries: this.getLibraries(response[CLASSPATH_ENTRIES_KEY]),
        };
        const baseFsPath = uri.fsPath;

        const outputRelativePath: string = path.relative(baseFsPath, classpath.defaultOutputPath);
        if (!outputRelativePath.startsWith("..")) {
            classpath.defaultOutputPath = path.relative(baseFsPath, classpath.defaultOutputPath);
        }

        classpath.libraries = classpath.libraries.map(l => {
            return {
                ...l,
                path: vscode.Uri.file(l.path).fsPath,
            };
        });
        return classpath;
    }

    private async getSourceRoots(classpathEntries: ClasspathEntry[], baseUri: vscode.Uri): Promise<ClasspathEntry[]> {
        const result: ClasspathEntry[] = [];
        const baseFsPath = baseUri.fsPath;
        for (const entry of classpathEntries) {
            if (entry.kind !== ClasspathEntryKind.Source) {
                continue;
            }

            if (!await fse.pathExists(entry.path)) {
                continue;
            }
            let relativePath: string = path.relative(baseFsPath, entry.path);
            if (!relativePath) {
                relativePath = ".";
            }
            let relativeOutputPath: string | undefined;
            if (entry.output) {
                relativeOutputPath = path.relative(baseFsPath, entry.output);
                if (!relativeOutputPath) {
                    relativeOutputPath = ".";
                }
            }
            result.push({
                kind: entry.kind,
                path: relativePath,
                output: relativeOutputPath,
                attributes: entry.attributes,
            });
        }
        return result.sort((srcA: ClasspathEntry, srcB: ClasspathEntry) => {
            return srcA.path.localeCompare(srcB.path);
        });
    }

    private getLibraries(classpathEntries: ClasspathEntry[]): ClasspathEntry[] {
        const result: ClasspathEntry[] = [];
        for (const entry of classpathEntries) {
            if (entry.kind === ClasspathEntryKind.Source || entry.kind === ClasspathEntryKind.Container) {
                continue;
            }
            result.push({
                kind: entry.kind,
                path: entry.path,
                attributes: entry.attributes,
            });
        }

        return result;
    }

    private getReferencedLibrariesSetting(): IReferencedLibraries {
        const setting = vscode.workspace.getConfiguration("java.project").get<string[] | Partial<IReferencedLibraries>>("referencedLibraries");
        const defaultSetting: IReferencedLibraries = { include: [], exclude: [], sources: {} };
        if (Array.isArray(setting)) {
            return { ...defaultSetting, include: setting };
        } else {
            return { ...defaultSetting, ...setting };
        }
    }

    private updateReferencedLibraries(libraries: IReferencedLibraries): void {
        let updateSetting: string[] | Partial<IReferencedLibraries> = {
            include: libraries.include,
            exclude: libraries.exclude.length > 0 ? libraries.exclude : undefined,
            sources: Object.keys(libraries.sources).length > 0 ? libraries.sources : undefined,
        };
        if (!updateSetting.exclude && !updateSetting.sources) {
            updateSetting = libraries.include;
        }
        vscode.workspace.getConfiguration().update("java.project.referencedLibraries", updateSetting);
    }
}

const NATURE_IDS: string = "org.eclipse.jdt.ls.core.natureIds"
const OUTPUT_PATH_KEY: string = "org.eclipse.jdt.ls.core.outputPath";
const VM_LOCATION_KEY: string = "org.eclipse.jdt.ls.core.vm.location";
const CLASSPATH_ENTRIES_KEY: string = "org.eclipse.jdt.ls.core.classpathEntries";

interface IReferencedLibraries {
    include: string[];
    exclude: string[];
    sources: { [binary: string]: string };
}

interface IJdkUpdateResult {
    success: boolean;
    message: string;
}
