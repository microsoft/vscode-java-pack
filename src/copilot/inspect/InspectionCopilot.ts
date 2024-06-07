import Copilot from "../Copilot";
import { getClassesContainedInRange, getInnermostClassContainsRange, getIntersectionSymbolsOfRange, getProjectJavaVersion, getSymbolsOfDocument, getUnionRange, logger, METHOD_KINDS, sendEvent, shrinkEndLineIndex, shrinkStartLineIndex } from "../utils";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, Range, window, LanguageModelChatMessage } from "vscode";
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
    Please analyze the given code and its context (including Java version, imports/dependencies, etc.) to 
    identify possible enhancements using modern built-in Java features. 
    Keep these rules in mind:
    - The code has been annotated with zero-based line numbers as comments (e.g., /* 0 */, /* 1 */, etc.) at the beginning of each line for reference. The code may be part of a Java file, so the line numbers may not start from 1.
    - Focus on leveraging built-in features from modern Java (Java 8 and onwards) to make the code more concise, readable, and efficient.
    - Avoid suggesting the use of third-party libraries or frameworks.
    - Do not suggest improvements for commented-out code.
    - Avoid repeated suggestions for the same code block.
    - Keep scoping rules in mind. 
    - Provide suggestions in an RFC8259 compliant JSON array, each item representing a suggestion. Follow the given format strictly:
    \`\`\`json
    [{
        "problem": {
            "position": {
                "startLine": "start line number of the rewritable code block",
                "endLine": "end line number of the rewritable code block",
            },
            "description":"Brief description of the issue in the code, preferably in less than 10 words, starting with a gerund/noun word, e.g., 'Using'.",
            "identity": "Identifity of the rewritable code block, a single word in the block. It could be a Java keyword, a method/field/variable name, or a value (e.g., magic number). Use '<null>' if cannot be identified."
        },
        "solution": "Brief description of the solution to the problem, preferably in less than 10 words, starting with a verb."
    }]
    \`\`\`
    - Maintain clarity, helpfulness, and thoroughness in your suggestions and keep them short and impersonal.
    - Use developer-friendly terms and analogies in your suggestions.
    - Avoid wrapping the whole response in triple backticks.
    - Always conclude your response with "${Copilot.DEFAULT_END_MARK}" to indicate the end of your response.
    Your primary aim is to enhance the code while promoting the use of modern built-in Java features.
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
            const expandedRange: Range = getUnionRange(symbols).union(range);

            // inspect the expanded union range
            const target = symbol ? symbol.toString() : (symbols[0].toString() + (symbols.length > 1 ? ", etc." : ""));
            const inspections: Inspection[] = await window.withProgress({
                location: ProgressLocation.Notification,
                title: `Inspecting ${target}...`,
                cancellable: false
            }, (_progress) => {
                return this.inspectCode(document, expandedRange);
            });
            this.updateAndCacheInspections(document, symbols, inspections);
            sendEvent('java.copilot.inspection.inspectingDone');

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
            return inspections;
        } finally {
            this.inspecting.delete(document);
        }
    }

    /**
     * Update the symbol, document, and relative line number of the inspections.
     */
    private updateAndCacheInspections(document: TextDocument, symbols: SymbolNode[], inspections: Inspection[]) {
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
            InspectionCache.cacheInspections(document, symbol, symbolInspections);
        }
    }

    private async inspectCode(document: TextDocument, range: Range): Promise<Inspection[]> {
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
        const rawResponse = await this.send(InspectionCopilot.FORMAT_CODE(projectContext, linedDocumentCode));
        const inspections = this.extractInspections(rawResponse, documentCodeLines);
        // add properties for telemetry
        sendEvent('java.copilot.inspection.inspectionsReceived', {
            javaVersion: projectContext.javaVersion,
            codeWords: linedDocumentCode.split(/\s+/).length,
            codeLines: documentCodeLines.length,
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
                // shrink to the actual code lines
                position.startLine = shrinkStartLineIndex(codeLines, position.startLine);
                position.endLine = shrinkEndLineIndex(codeLines, position.endLine);
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