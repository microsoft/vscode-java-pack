// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import { getExtensionContext, getNonce } from "../utils";
import * as fse from "fs-extra";
import { ProjectInfo, ClasspathComponent, ClasspathViewException, VmInstall, ClasspathEntry, ClasspathEntryKind } from "./types";
import _ from "lodash";
import { instrumentOperation, sendError, sendInfo, setUserError } from "vscode-extension-telemetry-wrapper";
import { getProjectNameFromUri, getProjectType, isDefaultProject } from "../utils/jdt";
import { ProjectType } from "../utils/webview";
import compareVersions from "compare-versions";

let classpathConfigurationPanel: vscode.WebviewPanel | undefined;
let lsApi: LanguageServerAPI | undefined;
let currentProjectRoot: vscode.Uri;
const NATURE_IDS: string = "org.eclipse.jdt.ls.core.natureIds"
const OUTPUT_PATH_KEY: string = "org.eclipse.jdt.ls.core.outputPath";
const VM_LOCATION_KEY: string = "org.eclipse.jdt.ls.core.vm.location";
const CLASSPATH_ENTRIES_KEY: string = "org.eclipse.jdt.ls.core.classpathEntries";
const MINIMUM_JAVA_EXTENSION_VERSION: string = "0.77.0";

export async function showClasspathConfigurationPage(context: vscode.ExtensionContext): Promise<void> {
    if (classpathConfigurationPanel) {
        classpathConfigurationPanel.reveal();
        return;
    }

    classpathConfigurationPanel = vscode.window.createWebviewPanel(
        "java.classpathConfiguration",
        "Project Settings",
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            enableCommandUris: true,
            retainContextWhenHidden: true
        }
    );

    await initializeWebview(context);
}

export class ClassPathConfigurationViewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: any) {
        classpathConfigurationPanel = webviewPanel;
        await initializeWebview(getExtensionContext());
    }
}

async function initializeWebview(context: vscode.ExtensionContext): Promise<void> {
    if (!classpathConfigurationPanel) {
        sendError(new Error("classpathConfigurationPanel is not defined."));
        return;
    }

    context.subscriptions.push(classpathConfigurationPanel.onDidDispose(_e => classpathConfigurationPanel = undefined));

    classpathConfigurationPanel.iconPath = {
        light: vscode.Uri.file(path.join(context.extensionPath, "caption.light.svg")),
        dark: vscode.Uri.file(path.join(context.extensionPath, "caption.dark.svg"))
    };

    context.subscriptions.push(
        classpathConfigurationPanel.webview.onDidReceiveMessage((async (message) => {
            switch (message.command) {
                case "onWillListProjects":
                    await listProjects();
                    break;
                case "onWillListVmInstalls": 
                    await listVmInstalls();
                    break;
                case "onWillLoadProjectClasspath":
                    currentProjectRoot = vscode.Uri.parse(message.uri);
                    await loadProjectClasspath(currentProjectRoot);
                    break;
                case "onWillSelectOutputPath":
                    await selectOutputPath(currentProjectRoot);
                    break;
                case "onWillAddSourcePathForUnmanagedFolder":
                    await addSourcePathForUnmanagedFolder(currentProjectRoot);
                    break;
                case "onWillSelectFolder":
                    await selectFolder(currentProjectRoot, message.type);
                    break;
                case "onWillUpdateClassPaths":
                    await updateClassPaths(message.rootPaths, message.projectTypes, message.sourcePaths, message.defaultOutputPaths, message.vmInstallPaths, message.libraries);
                    break;
                case "onWillAddNewJdk":
                    await addNewJdk(currentProjectRoot);
                case "onWillSelectLibraries":
                    await selectLibraries(currentProjectRoot);
                    break;
                case "onClickGotoProjectConfiguration":
                    gotoProjectConfigurationFile(message.rootUri, message.projectType);
                    break;
                case "onWillExecuteCommand":
                    executeCommand(message.id);
                    break;
                default:
                    break;
            }
        })),
        vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration("java.configuration.runtimes")) {
                debounceListVmInstalls();
            }
        }),
    );

    classpathConfigurationPanel.webview.html = getHtmlForWebview(classpathConfigurationPanel.webview, context.asAbsolutePath("./out/assets/classpath/index.js"));

    await checkRequirement();
}

function getHtmlForWebview(webview: vscode.Webview, scriptPath: string) {
    const scriptPathOnDisk = vscode.Uri.file(scriptPath);
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
        <meta name="theme-color" content="#000000">
        <title>Project Settings</title>
    </head>
    <body>
        <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
        <div id="content"></div>
    </body>

    </html>
    `;
}

async function checkRequirement(): Promise<boolean> {
    if (lsApi) {
        return true;
    }
    const javaExt = vscode.extensions.getExtension("redhat.java");
    if (!javaExt) {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onException",
            exception: ClasspathViewException.JavaExtensionNotInstalled,
        });
        const err: Error = new Error("The extension 'redhat.java' is not installed.");
        setUserError(err);
        sendError(err);
        return false;
    }

    const javaExtVersion: string = javaExt.packageJSON.version;
    if (compareVersions(javaExtVersion, MINIMUM_JAVA_EXTENSION_VERSION) < 0) {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onException",
            exception: ClasspathViewException.StaleJavaExtension,
        });
        const err: Error = new Error(`The extension version of 'redhat.java' (${javaExtVersion}) is too stale.`);
        setUserError(err);
        sendError(err);
        return false;
    }

    await javaExt.activate();
    lsApi = javaExt.exports;

    if (lsApi) {
        getExtensionContext().subscriptions.push(
            lsApi.onDidProjectsImport(() => {
                listProjects();
            }),
            lsApi.onDidClasspathUpdate((uri: vscode.Uri) => {
                if (currentProjectRoot && !path.relative(uri.fsPath, currentProjectRoot.fsPath)) {
                    // Use debounced function to avoid UI jittery
                    debounceLoadProjectClasspath(uri);
                }
            }),
        );
    }

    return true;
}

const listProjects = instrumentOperation("classpath.listProjects", async (operationId: string) => {
    // listProjects() will be called when the component is mounted,
    // we first check the requirement here in case user triggers 'reload webview'
    if (!(await checkRequirement())) {
        return;
    }
    let projects: ProjectInfo[] = await getProjectsFromLS();

    _.remove(projects, (p: ProjectInfo) => {
        return isDefaultProject(p.rootPath);
    });

    if (projects.length === 0) {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onException",
            exception: ClasspathViewException.NoJavaProjects,
        });
    } else {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidListProjects",
            projectInfo: projects,
        });
    }

    sendInfo(operationId, {
        projectNumber: projects.length,
    });
});

const listVmInstalls = instrumentOperation("classpath.listVmInstalls", async (operationId: string) => {
    let vmInstalls: VmInstall[] = await getVmInstallsFromLS();
    vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
        return vmA.name.localeCompare(vmB.name);
    });

    if (vmInstalls.length > 0) {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidListVmInstalls",
            vmInstalls,
        });
    } else {
        sendInfo(operationId, {
            vmNumber: vmInstalls.length,
        });
    }
});
const debounceListVmInstalls = _.debounce(listVmInstalls, 3000 /*ms*/);

const loadProjectClasspath = instrumentOperation("classpath.loadClasspath", async (operationId: string, currentProjectRoot: vscode.Uri) => {
    const classpath = await getProjectClasspathFromLS(currentProjectRoot);
    if (classpath) {
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidLoadProjectClasspath",
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

const debounceLoadProjectClasspath = _.debounce(loadProjectClasspath, 3000 /*ms*/);

async function selectSourceFolderPath(currentProjectRoot: vscode.Uri): Promise<string | undefined> {
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
            throw(err);
        }
        if (!relativePath) {
            relativePath = ".";
        }
        return relativePath;
    }
    return undefined;
}

const addSourcePathForUnmanagedFolder = instrumentOperation("classpath.addSourcePathForUnmanagedFolder", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
    const relativePath: string | undefined = await selectSourceFolderPath(currentProjectRoot);
    if (!relativePath) {
        return;
    }
    const sourcePaths: string[] = vscode.workspace.getConfiguration("java", currentProjectRoot).get<string[]>("project.sourcePaths") || [];
    if (sourcePaths.includes(relativePath)) {
        vscode.window.showInformationMessage(`The path ${relativePath} has already been a source path.`);
        return;
    }
    sourcePaths.push(relativePath);
    classpathConfigurationPanel?.webview.postMessage({
        command: "onDidUpdateSourceFolder",
        sourcePaths,
    });
});

const updateSourcePathsForUnmanagedFolder = instrumentOperation("classpath.updateSourcePathsForUnmanagedFolder", async (_operationId: string, currentProjectRoot: vscode.Uri, sourcePaths: string[]) => {
    vscode.workspace.getConfiguration("java", currentProjectRoot).update(
        "project.sourcePaths",
        sourcePaths,
        vscode.ConfigurationTarget.Workspace,
    );
});

const selectFolder = instrumentOperation("classpath.selectFolder", async (_operationId: string, currentProjectRoot: vscode.Uri, type: string) => {
    const relativePath: string | undefined = await selectSourceFolderPath(currentProjectRoot);
    if (!relativePath) {
        return;
    }
     classpathConfigurationPanel?.webview.postMessage({
        command: "onDidSelectFolder",
        path: relativePath,
        type: type,
    });
});

const updateClassPaths = instrumentOperation("classpath.updateClassPaths", async (_operationId: string, rootPaths: string[], projectTypes: ProjectType[], sourcePaths: ClasspathEntry[][], defaultOutputPaths: string[], vmInstallPaths: string[], libraries: ClasspathEntry[][]) => {
    classpathConfigurationPanel?.webview.postMessage({
        command: "onDidChangeLoadingState",
        loading: true,
    });

    try {
        const projectCount = rootPaths.length;
        for (let i = 0; i < projectCount; i++) {
            const currentProjectRoot: vscode.Uri = vscode.Uri.parse(rootPaths[i]);
            if (projectTypes[i] === ProjectType.UnmanagedFolder) {
                updateSourcePathsForUnmanagedFolder(currentProjectRoot, sourcePaths[i].map(sp => sp.path));
                setOutputPath( currentProjectRoot, defaultOutputPaths[i]);
                updateUnmanagedFolderLibraries(libraries[i].map(l => l.path));
                changeJdk(currentProjectRoot, vmInstallPaths[i]);
            } else {
                const classpathEntries: ClasspathEntry[] = [];
                classpathEntries.push(...sourcePaths[i]);
                if (vmInstallPaths[i]?.length > 0) {
                    classpathEntries.push({
                        kind: ClasspathEntryKind.Container,
                        path: `org.eclipse.jdt.launching.JRE_CONTAINER/${vmInstallPaths[i]}`,
                    });
                }
                classpathEntries.push(...libraries[i]);
                if (classpathEntries.length > 0) {
                    await vscode.commands.executeCommand(
                        "java.execute.workspaceCommand",
                        "java.project.updateClassPaths",
                        currentProjectRoot.toString(),
                        JSON.stringify({classpathEntries}),
                    );
                }
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

    classpathConfigurationPanel?.webview.postMessage({
        command: "onDidChangeLoadingState",
        loading: false,
    });
});

const selectOutputPath = instrumentOperation("classpath.selectOutputPath", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
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
            throw(err);
        }
        if (!outputRelativePath) {
            const err: Error = new Error("Cannot set the project root path as the output path.");
            vscode.window.showErrorMessage(err.message);
            setUserError(err);
            throw(err);
        }
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidSelectOutputPath",
            output: outputRelativePath,
        });
    }
});

const setOutputPath = instrumentOperation("classpath.setOutputPath", async (operationId: string, currentProjectRoot: vscode.Uri, outputRelativePath: string) => {
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

const addNewJdk = instrumentOperation("classpath.addNewJdk", async (operationId: string, currentProjectRoot: vscode.Uri) => {
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

    actionResult.message = result.message;
    actionResult.code = result.success ? "0" : "1";
    sendInfo(operationId, actionResult);

    if (result.success) {
        const activeVmInstallPath = result.message;
        let vmInstalls: VmInstall[] = await getVmInstallsFromLS();
        vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
            return vmA.name.localeCompare(vmB.name);
        });
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidChangeJdk",
            activeVmInstallPath,
            vmInstalls,
        });
    } else {
        vscode.window.showErrorMessage(result.message);
        const err: Error = new Error(result.message);
        setUserError(err);
        throw(err);
    }
});

const changeJdk = instrumentOperation("classpath.changeJdk", async (operationId: string, currentProjectRoot: vscode.Uri, jdkPath: string) => {
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

    actionResult.message = result.message;
    actionResult.code = result.success ? "0" : "1";
    sendInfo(operationId, actionResult);

    if (result.success) {
        const activeVmInstallPath = result.message;
        let vmInstalls: VmInstall[] = await getVmInstallsFromLS();
        vmInstalls = vmInstalls.sort((vmA: VmInstall, vmB: VmInstall) => {
            return vmA.name.localeCompare(vmB.name);
        });
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidChangeJdk",
            activeVmInstallPath,
            vmInstalls,
        });
    } else {
        vscode.window.showErrorMessage(result.message);
        const err: Error = new Error(result.message);
        setUserError(err);
        throw(err);
    }
});

const executeCommand = instrumentOperation("classpath.executeCommand", async (operationId: string, commandId: string) => {
    await vscode.commands.executeCommand(commandId);
    sendInfo(operationId, {
        operationName: "classpath.executeCommand",
        arg: commandId,
    });
});

const selectLibraries = instrumentOperation("classpath.selectLibraries", async (_operationId: string, currentProjectRoot: vscode.Uri) => {
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
        classpathConfigurationPanel?.webview.postMessage({
            command: "onDidAddLibraries",
            jars: jarPaths.map(jarPath => {
                return {
                    kind: ClasspathEntryKind.Library,
                    path: jarPath,
                };
            }),
        });
    }
});

const updateUnmanagedFolderLibraries = instrumentOperation("classpath.updateUnmanagedFolderLibraries", async (_operationId: string, jarFilePaths: string[]) => {
    const setting = getReferencedLibrariesSetting();
    setting.include = jarFilePaths;
    updateReferencedLibraries(setting);
});

const gotoProjectConfigurationFile = instrumentOperation("classpath.gotoProjectConfigurationFile", (operationId: string, rootUri: string, projectType: ProjectType) => {
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
        throw(err);
    }
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(configurationPath));
    sendInfo(operationId, {
        projectType,
    });
});

async function getProjectsFromLS(): Promise<ProjectInfo[]> {
    const ret: ProjectInfo[] = [];
    let projects: string[] = [];
    try {
        projects = await vscode.commands.executeCommand("java.execute.workspaceCommand", "java.project.getAll") || [];
    } catch (error) {
        // LS not ready
    }

    for (const projectRoot of projects) {
        ret.push({
            name: getProjectNameFromUri(projectRoot),
            rootPath: projectRoot,
        });
    }
    return ret;
}

async function getVmInstallsFromLS(): Promise<VmInstall[]> {
    const ret: VmInstall[] = [];
    try {
        ret.push(...await vscode.commands.executeCommand<VmInstall[]>("java.execute.workspaceCommand", "java.vm.getAllInstalls") || []);
    } catch (error) {
    }
    return ret;
}

async function getProjectClasspathFromLS(uri: vscode.Uri): Promise<ClasspathComponent> {
    const queryKeys: string[] = [
        NATURE_IDS,
        OUTPUT_PATH_KEY,
        VM_LOCATION_KEY,
        CLASSPATH_ENTRIES_KEY,
    ];

    const response = await lsApi!.getProjectSettings(
        uri.toString(),
        queryKeys
    );
    const classpath: ClasspathComponent = {
        projectType: getProjectType(uri.fsPath, response[NATURE_IDS] as string[]),
        sourcePaths: await getSourceRoots(response[CLASSPATH_ENTRIES_KEY], uri),
        defaultOutputPath: response[OUTPUT_PATH_KEY] as string,
        jdkPath: response[VM_LOCATION_KEY] as string,
        libraries: getLibraries(response[CLASSPATH_ENTRIES_KEY]),
    };
    const baseFsPath = uri.fsPath;

    const outputRelativePath: string = path.relative(baseFsPath, classpath.defaultOutputPath);
    if (!outputRelativePath.startsWith("..")) {
        classpath.defaultOutputPath = path.relative(baseFsPath, classpath.defaultOutputPath);
    }

    classpath.libraries = classpath.libraries.map(l => {
        let normalizedPath: string = vscode.Uri.file(l.path).fsPath;
        if (normalizedPath.startsWith(baseFsPath)) {
            normalizedPath = path.relative(baseFsPath, normalizedPath);
        }

        return {
            ...l,
            path: normalizedPath,
        };
    });
    return classpath;
}

async function getSourceRoots(classpathEntries: ClasspathEntry[], baseUri: vscode.Uri): Promise<ClasspathEntry[]> {
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

function getLibraries(classpathEntries: ClasspathEntry[]): ClasspathEntry[] {
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

function getReferencedLibrariesSetting(): IReferencedLibraries {
    const setting = vscode.workspace.getConfiguration("java.project").get<string[] | Partial<IReferencedLibraries>>("referencedLibraries");
    const defaultSetting: IReferencedLibraries = { include: [], exclude: [], sources: {} };
    if (Array.isArray(setting)) {
        return { ...defaultSetting, include: setting };
    } else {
        return { ...defaultSetting, ...setting };
    }
}

function updateReferencedLibraries(libraries: IReferencedLibraries): void {
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

interface LanguageServerAPI {
    onDidProjectsImport: vscode.Event<vscode.Uri>;
    onDidClasspathUpdate: vscode.Event<vscode.Uri>;
    getProjectSettings: (uri: string, SettingKeys: string[]) => Promise<any>;
}

interface IReferencedLibraries {
    include: string[];
    exclude: string[];
    sources: { [binary: string]: string };
}

interface IJdkUpdateResult {
    success: boolean;
    message: string;
}
