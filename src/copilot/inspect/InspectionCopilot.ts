import Copilot from "../Copilot";
import { getClassesContainedInRange, getInnermostClassContainsRange, getIntersectionSymbolsOfRange, getProjectJavaVersion, getSymbolsOfDocument, getUnionRange, logger, sendEvent, shrinkEndLineIndex, shrinkStartLineIndex } from "../utils";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, Position, Range, window, LanguageModelChatMessage } from "vscode";
import InspectionCache from "./InspectionCache";
import { SymbolNode } from "./SymbolNode";
import { randomUUID } from "crypto";

export default class InspectionCopilot extends Copilot {
    public static readonly FORMAT_CODE = (context: ProjectContext, code: string) => `
    Current project uses Java ${context.javaVersion}. please suggest improvements compatible with this version for code below (do not format the reponse, and do not respond markdown):    
    \`\`\`java
    ${code}
    \`\`\`
    `;
    public static readonly SYSTEM_MESSAGE = `
    **You are expert at Java and promoting newer built-in features of Java.**
    please examine the provided code and any other context like java version, imports/dependencies...,ect. and then 
    identify and suggest improvements for selected code lines that can be optimized using newer features of Java. 
    Keep the following rules in mind:
    - Focus on utilizing built-in features from recent Java versions (Java 8 and onwards) to make the code more readable, efficient, and concise.
    - Avoid suggesting the use of third-party libraries or frameworks.
    - Avoid suggesting on correct code, unless there is a better way to write it.
    - Avoid suggesting on code that is not certain to have issues.
    - Avoid suggesting on short/simple code that is easy to read.
    - Avoid suggesting on commented out code.
    - Avoid suggesting changes that would change the behavior of the code.
    - Keep scoping rules in mind. 
    - The provided code has been added line numbers as comments for your reference.
    - Reply with an RFC8259 compliant JSON array following the format below without deviation. Each array item represents a suggestion.
    \`\`\`json
    [{
        "problem": {
            "position": {
                "startLine": "start line number of the rewritable code block",
                "endLine": "end line number of the rewritable code block",
            },
            "description":"Brief description of the issue in the code, preferably in less than 10 words. Start with a gerund/noun word, e.g., 'Using'.",
            "identity": "Identifity of the rewritable code block, a single word in the block. It could be a Java keyword, a method/field/variable name, or a value (e.g., magic number). Use '<null>' if cannot be identified."
        },
        "solution": "Brief description of the solution to the problem, preferably in less than 10 words. Start with a verb."
    }]
    \`\`\`

    - Focus on being clear, helpful, and thorough.
    - Use developer-friendly terms and analogies in your explanations.
    - Keep your answers short and impersonal.
    - Avoid wrapping the whole response in triple backticks.
    - Always conclude your response with "${Copilot.DEFAULT_END_MARK}". This will help Copilot to identify the end of your response.

    Remember, your aim is to enhance the code, and promote the use of newer built-in Java features at the same time!
    `;
    public static readonly EXAMPLE_USER_MESSAGE = this.FORMAT_CODE({ javaVersion: '17' }, `
    /* 1 */ package com.example;
    /* 2 */
    /* 3 */ public class EmployeePojo implements Employee {
    /* 4 */ 
    /* 5 */     private final String name;
    /* 6 */
    /* 7 */     public EmployeePojo(String name) {     
    /* 8 */         this.name = name;
    /* 9 */     }
    /* 10 */
    /* 11 */     public String getName() {
    /* 12 */         return name;
    /* 13 */     }
    /* 14 */
    /* 15 */     public String getRole() {
    /* 16 */         String result = "";
    /* 17 */         if (this.name.equals("John")) {
    /* 18 */             result = "Senior";
    /* 19 */         } else if (this.name.equals("Mike")) {
    /* 20 */             result = "HR";
    /* 21 */         } else {
    /* 22 */             result = "FTE";
    /* 23 */         }
    /* 26 */         return result;
    /* 27 */     }
    /* 28 */ }
    `);
    public static readonly EXAMPLE_ASSISTANT_MESSAGE =
        `[
        {
            "problem": {
                "position": { "startLine": 3, "endLine": 28 },
                "description": "Using traditional POJO",
                "identity": "EmployeePojo"
            }
            "solution": "Use record",
        },
        {
            "problem": {
                "position": { "startLine": 17, "endLine": 23 },
                "problem": "Using multiple if-else",
                "identity": "if"
            }
            "solution": "Use enhanced switch expression",
        }
    ]
    ${Copilot.DEFAULT_END_MARK}`;

    private static readonly DEFAULT_MAX_CONCURRENCIES: number = 3;

    private readonly inspecting: Set<TextDocument> = new Set<TextDocument>();

    public constructor(
        private readonly maxConcurrencies: number = InspectionCopilot.DEFAULT_MAX_CONCURRENCIES,
    ) {
        super([
            LanguageModelChatMessage.User(InspectionCopilot.SYSTEM_MESSAGE),
            LanguageModelChatMessage.User(InspectionCopilot.EXAMPLE_USER_MESSAGE),
            LanguageModelChatMessage.Assistant(InspectionCopilot.EXAMPLE_ASSISTANT_MESSAGE),
        ]);
    }

    public get busy(): boolean {
        return this.inspecting.size >= this.maxConcurrencies;
    }

    public async inspectDocument(document: TextDocument): Promise<Inspection[]> {
        logger.info('inspecting document:', document.fileName);
        const documentSymbols = await getSymbolsOfDocument(document);
        if (documentSymbols.length < 1) {
            logger.warn('No symbol found in the document, skipping inspection.');
            return [];
        }
        const range = new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);
        return this.inspectRange(document, range);
    }

    public async inspectClass(document: TextDocument, clazz: SymbolNode): Promise<Inspection[]> {
        logger.info('inspecting class:', clazz.qualifiedName);
        return this.inspectRange(document, clazz.range, clazz);
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
            return Promise.resolve([]);
        }
        if (this.inspecting.has(document)) {
            sendEvent('java.copilot.inspection.inspectingCancelledDuplicate');
            return Promise.resolve([]);
        }
        try {
            sendEvent('java.copilot.inspection.inspectingStarted');
            this.inspecting.add(document);
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
                this.inspecting.delete(document);
                return this.inspectDocument(document);
            }

            // get the union range of the container symbols, which will be insepcted by copilot
            const expandedRange: Range = getUnionRange(symbols);

            // inspect the expanded union range
            const target = symbol ? symbol.toString() : (symbols[0].toString() + (symbols.length > 1 ? ", etc." : ""));
            const inspections: Inspection[] = await window.withProgress({
                location: ProgressLocation.Notification,
                title: `Inspecting ${target}...`,
                cancellable: false
            }, (_progress) => {
                return this.inspectCode(document, expandedRange);
            });

            // show message based on the number of inspections
            if (inspections.length < 1) {
                void window.showInformationMessage(`Inspected ${target}, and got 0 suggestions.`);
            } else {
                // show message to go to the first suggestion
                // inspected a, ..., etc. and got n suggestions.
                void window.showInformationMessage(`Inspected ${target}, and got ${inspections.length} suggestions.`, "Go to").then(selection => {
                    selection === "Go to" && void Inspection.revealFirstLineOfInspection(inspections[0]);
                });
            }
            InspectionCache.cache(document, symbols, inspections);
            sendEvent('java.copilot.inspection.inspectingDone');
            return inspections;
        } finally {
            this.inspecting.delete(document);
        }
    }

    private async inspectCode(document: TextDocument, range: Range): Promise<Inspection[]> {
        const adjustedRange = new Range(new Position(range.start.line, 0), new Position(range.end.line, document.lineAt(range.end.line).text.length));
        const code: string = document.getText(adjustedRange);
        const startLine = range.start.line;
        const projectContext = await this.collectProjectContext(document);
        const codeLines: string[] = code.split(/\r?\n/);
        const linedCode = codeLines.map((line, index) => `/* ${index + 1} */ ${line}`).join('\n');

        const rawResponse = await this.send(InspectionCopilot.FORMAT_CODE(projectContext, linedCode));
        const inspections = this.extractInspections(rawResponse, codeLines);
        inspections.forEach(s => {
            s.document = document;
            // real line index to the start of the document
            s.problem.position.startLine = s.problem.position.relativeStartLine + startLine;
            s.problem.position.endLine = s.problem.position.relativeEndLine + startLine;
        });
        // add properties for telemetry
        sendEvent('java.copilot.inspection.inspectionsReceived', {
            javaVersion: projectContext.javaVersion,
            codeWords: code.split(/\s+/).length,
            codeLines: codeLines.length,
            insectionsCount: inspections.length,
            inspections: inspections.map(i => JSON.stringify({
                problem: i.problem.description,
                solution: i.solution,
            })).join(','),
        });
        return inspections;
    }

    private extractInspections(rawResponse: string, codeLines: string[]): Inspection[] {
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
                // line number in the response is 1-based, adjust to 0-based, and shrink to the actual code lines
                position.startLine = shrinkStartLineIndex(codeLines, position.startLine - 1);
                position.endLine = shrinkEndLineIndex(codeLines, position.endLine - 1);
                position.relativeStartLine = position.startLine;
                position.relativeEndLine = position.endLine;
                position.code = codeLines[position.startLine];

                validInspections.push(inspection);
            }
        }
        return validInspections.sort((a, b) => a.problem.position.startLine - b.problem.position.startLine);
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