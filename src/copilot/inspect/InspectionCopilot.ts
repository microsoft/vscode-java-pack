import Copilot from "../Copilot";
import { getClassesContainedInRange, getInnermostClassContainsRange, getIntersectionSymbolsOfRange, getProjectJavaVersion, getSymbolsOfDocument, getUnionRange, logger, METHOD_KINDS, sendEvent, shrinkEndLineIndex, shrinkStartLineIndex } from "../utils";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, Range, window, LanguageModelChatMessage, CancellationToken, LanguageModelChat } from "vscode";
import InspectionCache from "./InspectionCache";
import { SymbolNode } from "./SymbolNode";
import { randomUUID } from "crypto";
import path from "path";

export default class InspectionCopilot extends Copilot {
    public static readonly DEFAULT_MODEL = { family: 'gpt-4' };
    public static readonly FORMAT_CODE = (context: ProjectContext, code: string) => `
    Current project uses Java ${context.javaVersion}. please suggest improvements compatible with this version for code below (do not format the reponse, and do not respond markdown):    
    \`\`\`java
    ${code}
    \`\`\`
    `;
    public static readonly SYSTEM_MESSAGE = `
    **You are expert at Java, You are tasked to promote newer built-in features of Java.**
    Please analyze the given code and its context (including Java version, imports/dependencies, etc.) to 
    identify possible enhancements using modern built-in Java features. 
    Keep these rules in mind:
    - Provided code is from a Java file, zero-based line numbers are added as comments (e.g., /* 0 */, /* 1 */, etc.) at the beginning of each line for reference.
    - Only suggest built-in Java features, don't identify problems or provide suggestions related to 3rd-party libraries/frameworks.
    - Only suggest built-in Java features added in Java 8 or later, your suggestions should always be compatible with the given Java version. 
    - Your suggestions should make the code more concise, readable, and efficient.
    - Don't suggest improvements for commented-out code.
    - Avoid repeated suggestions for the same code block.
    - Keep scoping rules in mind. 
    - Maintain clarity, helpfulness, and thoroughness in your suggestions and keep them short and impersonal.
    - Use developer-friendly terms and analogies in your suggestions.
    - Provide suggestions in an RFC8259 compliant JSON array, each item representing a suggestion. Follow the given format strictly:
    \`\`\`json
    [{
        "problem": {
            "position": {
                "startLine": "start line number of the rewritable code block",
                "endLine": "end line number of the rewritable code block",
            },
            "description":"Brief description of the issue in the code, preferably in less than 10 words, as short as possible, starting with a gerund/noun word, e.g., 'Using'.",
            "identity": "Identifity of the rewritable code block, a single word in the block. It could be a Java keyword, a method/field/variable name, or a value (e.g., magic number). Use '<null>' if cannot be identified."
        },
        "solution": "Brief description of the solution to the problem, preferably in less than 10 words, as short as possible, starting with a verb."
    }]
    \`\`\`
    - Reply an empty array if no suggestions can be made.
    - Avoid wrapping the whole response in triple backticks.
    - Always conclude your response with "//${Copilot.DEFAULT_END_MARK}" to indicate the end of your response.
    `;
    public static readonly EXAMPLE_USER_MESSAGE = this.FORMAT_CODE({ javaVersion: '17' },
        `/* 3 */ public class EmployeePojo implements Employee {
    /* 4 */ 
    /* 5 */     private final String name;
    /* 6 */
    /* 7 */     public EmployeePojo(String name) {     
    /* 8 */         this.name = name;
    /* 9 */     }
    /* 10 */
    /* 11 */     public String getRole() {
    /* 12 */         String result = "";
    /* 13 */         if (this.name.equals("John")) {
    /* 14 */             result = "Senior";
    /* 15 */         } else if (this.name.equals("Mike")) {
    /* 16 */             result = "HR";
    /* 17 */         } else {
    /* 18 */             result = "FTE";
    /* 19 */         }
    /* 20 */         return result;
    /* 21 */     }
    /* 22 */
    /* 23 */     public String getName() {
    /* 24 */         return name;
    /* 25 */     }
    /* 26 */ }`);
    public static readonly EXAMPLE_ASSISTANT_MESSAGE =
        `[
        {
            "problem": {
                "position": { "startLine": 13, "endLine": 19 },
                "description": "Using multiple if-else",
                "identity": "if"
            }
            "solution": "Use enhanced switch expression",
        }
    ]
    ${Copilot.DEFAULT_END_MARK}`;

    private static readonly DEFAULT_MAX_CONCURRENCIES: number = 3;

    private readonly inspecting: Set<TextDocument> = new Set<TextDocument>();

    public constructor(
        model: LanguageModelChat,
        private readonly maxConcurrencies: number = InspectionCopilot.DEFAULT_MAX_CONCURRENCIES,
    ) {
        super(model, [LanguageModelChatMessage.User(InspectionCopilot.SYSTEM_MESSAGE)]);
    }

    public get busy(): boolean {
        return this.inspecting.size >= this.maxConcurrencies;
    }

    public async inspectDocument(document: TextDocument): Promise<Inspection[]> {
        logger.info('inspecting document:', path.basename(document.fileName));
        const documentSymbols = await getSymbolsOfDocument(document);
        if (documentSymbols.length < 1) {
            logger.warn('No symbol found in the document, skipping inspection.');
            return [];
        }
        const documentRange = new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);
        return this.inspectRange(document, documentRange);
    }

    public async inspectClass(document: TextDocument, clazz: SymbolNode): Promise<Inspection[]> {
        logger.info('inspecting class:', clazz.qualifiedName);
        const documentRange = new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);
        return this.inspectRange(document, documentRange, clazz);
    }

    public async inspectSymbol(document: TextDocument, symbol: SymbolNode): Promise<Inspection[]> {
        logger.info(`inspecting symbol ${SymbolKind[symbol.kind]} ${symbol.qualifiedName}`);
        return this.inspectRange(document, symbol.range, symbol);
    }

    public async inspectRange(document: TextDocument, range: Range, symbol?: SymbolNode): Promise<Inspection[]> {
        if (this.busy) {
            sendEvent('java.copilot.inspection.inspectingCancelledBusy', { concurrency: this.inspecting.size });
            logger.warn('Copilot is busy, please retry after current inspecting tasks is finished.');
            void window.showWarningMessage(`Copilot is busy, please retry after current inspecting tasks are finished.`);
            return [];
        }
        if (this.inspecting.has(document)) {
            sendEvent('java.copilot.inspection.inspectingCancelledDuplicate');
            return [];
        }
        try {
            this.inspecting.add(document);
            sendEvent('java.copilot.inspection.inspectingStarted');
            // ajust the range to the minimal container class or method symbols
            const methodAndFields: SymbolNode[] = await getIntersectionSymbolsOfRange(range, document);
            const classes: SymbolNode[] = await getClassesContainedInRange(range, document);
            const symbols: SymbolNode[] = [...classes, ...methodAndFields];
            if (symbols.length < 1) {
                const containingClass: SymbolNode | undefined = await getInnermostClassContainsRange(range, document);
                containingClass && symbols.push(containingClass);
            }

            if (symbols.length < 1) {
                logger.warn('No symbol found in the range, inspecting the whole document.');
                void window.showWarningMessage(`Nothing to inspect.`);
                return [];
            }

            // get the union range of the container symbols, which will be insepcted by copilot
            const expandedRange: Range = getUnionRange(symbols).union(range);

            // inspect the expanded union range
            const target = symbol ? symbol.toString() : (symbols[0].toString() + (symbols.length > 1 ? ", etc." : ""));
            const inspections: Inspection[] = await window.withProgress({
                location: ProgressLocation.Notification,
                title: `Inspecting ${target}...`,
                cancellable: true
            }, (_progress, token: CancellationToken) => {
                return this.inspectCode(document, expandedRange, token);
            });
            this.updateAndCacheInspections(document, symbols, inspections);
            sendEvent('java.copilot.inspection.inspectingDone');

            // show message based on the number of inspections
            if (inspections.length < 1) {
                void window.showInformationMessage(`Inspected ${target}, but got no suggestions.`, 'Retry').then(selection => {
                    selection === "Retry" && void this.inspectRange(document, range, symbol);
                });
            } else {
                // show message to go to the first suggestion
                // inspected a, ..., etc. and got n suggestions.
                void window.showInformationMessage(`Inspected ${target}, and got ${inspections.length} suggestions.`, "Go to").then(selection => {
                    selection === "Go to" && void Inspection.revealFirstLineOfInspection(inspections[0]);
                });
            }
            return inspections;
        } finally {
            this.inspecting.delete(document);
        }
    }

    /**
     * Update the symbol, document, and relative line number of the inspections.
     */
    private updateAndCacheInspections(document: TextDocument, symbols: SymbolNode[], inspections: Inspection[], append: boolean = false) {
        for (const symbol of symbols) {
            const isMethod = METHOD_KINDS.includes(symbol.kind);
            const symbolInspections: Inspection[] = inspections.filter(inspection => {
                const inspectionLine = inspection.problem.position.startLine;
                return isMethod ?
                    // NOTE: method inspections are inspections whose `position.line` is within the method's range
                    inspectionLine >= symbol.range.start.line && inspectionLine <= symbol.range.end.line :
                    // NOTE: class/field inspections are inspections whose `position.line` is exactly the first line number of the class/field
                    inspectionLine === symbol.range.start.line;
            });
            // re-calculate `relativeLine` of method inspections, `relativeLine` is the relative line number to the start of the method
            symbolInspections.forEach(inspection => {
                inspection.symbol = symbol;
                inspection.document = document;
                inspection.problem.position.relativeStartLine = inspection.problem.position.startLine - symbol.range.start.line;
                inspection.problem.position.relativeEndLine = inspection.problem.position.endLine - symbol.range.start.line;
            });
            InspectionCache.cacheInspections(document, symbol, symbolInspections, append);
        }
    }

    public async inspectMore(document: TextDocument): Promise<Inspection[]> {
        if (this.busy) {
            sendEvent('java.copilot.inspection.moreInspectingCancelledBusy', { concurrency: this.inspecting.size });
            logger.warn('Copilot is busy, please retry after current inspecting tasks is finished.');
            void window.showWarningMessage(`Copilot is busy, please retry after current inspecting tasks are finished.`);
            return Promise.resolve([]);
        }
        if (this.inspecting.has(document)) {
            sendEvent('java.copilot.inspection.moreInspectingCancelledDuplicate');
            return Promise.resolve([]);
        }
        const symbols = await getSymbolsOfDocument(document);
        if (symbols.length < 1) {
            logger.warn('No symbol found in the document, skipping inspection.');
            return [];
        }
        try {
            logger.info('inspecting more:', path.basename(document.fileName));
            sendEvent('java.copilot.inspection.moreInspectingStarted');
            const documentCode: string = document.getText();
            const documentCodeLines: string[] = documentCode.split(/\r?\n/);
            const linedDocumentCode = documentCodeLines
                .map((line, index) => `/* ${index} */ ${line}`)
                .join('\n');
            const projectContext = await this.collectProjectContext(document);
            const existingInspections = await InspectionCache.getValidInspections(document);
            const existingInspectionsStr = JSON.stringify(existingInspections.map(i => {
                return {
                    problem: {
                        position: { startLine: i.problem.position.startLine, endLine: i.problem.position.endLine },
                        description: i.problem.description,
                        identity: i.problem.identity,
                    },
                    solution: i.solution,
                }
            }), null, 2);
            if (existingInspections.length < 1) {
                sendEvent('java.copilot.inspection.moreInspectingCancelledNoInspections');
                logger.warn('No existing inspections found, inspecting the document first.');
                return this.inspectDocument(document);
            }
            const inspections: Inspection[] = await window.withProgress({
                location: ProgressLocation.Notification,
                title: `Getting more suggestions for ${path.basename(document.fileName)}...`,
                cancellable: false
            }, async (_progress, token: CancellationToken) => {
                sendEvent('java.copilot.inspection.moreInspectingRequested');
                const rawResponse = await this.send([
                    LanguageModelChatMessage.User(InspectionCopilot.FORMAT_CODE(projectContext, linedDocumentCode)),
                    LanguageModelChatMessage.Assistant(existingInspectionsStr + `\n//${Copilot.DEFAULT_END_MARK}`),
                    LanguageModelChatMessage.User("any more?"),
                ], Copilot.DEFAULT_MODEL_OPTIONS, token);
                const rawInspections = this.extractInspections(rawResponse, documentCodeLines);
                // add properties for telemetry
                sendEvent('java.copilot.inspection.moreInspectionsReceived', {
                    insectionsCount: rawInspections.length,
                    inspections: rawInspections.map(i => JSON.stringify({
                        problem: i.problem.description,
                        solution: i.solution,
                    })).join(','),
                });
                return rawInspections;
            });
            this.updateAndCacheInspections(document, symbols, inspections, true);
            sendEvent('java.copilot.inspection.moreInspectingDone');

            // show message based on the number of inspections
            if (inspections.length < 1) {
                void window.showInformationMessage(`No more suggestions for ${path.basename(document.fileName)}.`, 'Retry').then(selection => {
                    selection === "Retry" && void this.inspectMore(document);
                });
            } else {
                void window.showInformationMessage(`Got ${inspections.length} more suggestions for ${path.basename(document.fileName)}.`, "Go to").then(selection => {
                    selection === "Go to" && void Inspection.revealFirstLineOfInspection(inspections[0]);
                });
            }
            return inspections;
        } finally {
            this.inspecting.delete(document);
        }
    }

    private async inspectCode(document: TextDocument, range: Range, token: CancellationToken): Promise<Inspection[]> {
        const startLine = range.start.line;
        const endLine = range.end.line;

        // add 0-based line numbers to the code
        const documentCode: string = document.getText();
        const documentCodeLines: string[] = documentCode.split(/\r?\n/);
        const linedDocumentCode = documentCodeLines
            .map((line, index) => `/* ${index} */ ${line}`)
            .filter((_, index) => index >= startLine && index <= endLine)
            .join('\n');

        const projectContext = await this.collectProjectContext(document);
        sendEvent('java.copilot.inspection.inspectingRequested', {
            javaVersion: projectContext.javaVersion,
            codeWords: linedDocumentCode.split(/\s+/).length,
            codeLines: documentCodeLines.length,
        });
        const rawResponse = await this.send([
            LanguageModelChatMessage.User(InspectionCopilot.EXAMPLE_USER_MESSAGE),
            LanguageModelChatMessage.Assistant(InspectionCopilot.EXAMPLE_ASSISTANT_MESSAGE),
            LanguageModelChatMessage.User(InspectionCopilot.FORMAT_CODE(projectContext, linedDocumentCode))
        ], Copilot.DEFAULT_MODEL_OPTIONS, token);
        const inspections = this.extractInspections(rawResponse, documentCodeLines);
        // add properties for telemetry
        sendEvent('java.copilot.inspection.inspectionsReceived', {
            insectionsCount: inspections.length,
            inspections: inspections.map(i => JSON.stringify({
                problem: i.problem.description,
                solution: i.solution,
            })).join(','),
        });

        return inspections;
    }

    private extractInspections(rawResponse: string, codeLines: string[]): Inspection[] {
        try {
            const rawInspections: Inspection[] = JSON.parse(rawResponse);
            const validInspections = [];
            // filter out invalid inspection that miss required fields and log.
            for (let i = 0; i < rawInspections.length; i++) {
                const inspection: Inspection = rawInspections[i];
                if (!inspection.problem?.position?.startLine || !inspection.problem.description || !inspection.solution) {
                    logger.warn(`Invalid inspection: ${JSON.stringify(inspection)}`);
                } else {
                    const position = inspection.problem.position;
                    inspection.id = randomUUID();
                    // shrink to the actual code lines
                    position.startLine = shrinkStartLineIndex(codeLines, position.startLine);
                    position.endLine = shrinkEndLineIndex(codeLines, position.endLine);
                    position.relativeStartLine = position.startLine;
                    position.relativeEndLine = position.endLine;
                    validInspections.push(inspection);
                }
            }
            return validInspections.sort((a, b) => a.problem.position.startLine - b.problem.position.startLine);
        } catch (e) {
            logger.warn('Failed to parse the response:', e);
            return [];
        }
    }

    async collectProjectContext(document: TextDocument): Promise<ProjectContext> {
        logger.info('collecting project context info (java version)...');
        const javaVersion = await getProjectJavaVersion(document);
        logger.info('project java version:', javaVersion);
        return { javaVersion };
    }
}

export interface ProjectContext {
    javaVersion: string;
}