import Copilot from "../Copilot";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, Range, window, LanguageModelChatMessage, CancellationToken, LanguageModelChat } from "vscode";
import InspectionCache from "./InspectionCache";
import { SymbolNode } from "./SymbolNode";
import path from "path";
import { sendEvent, } from "../utils";
import { getSymbolsOfDocument, getIntersectionSymbolsOfRange, getClassesContainedInRange, getInnermostClassContainsRange, getUnionRange, METHOD_KINDS } from "./utils.symbol";
import { extractInspections } from "./extractInspections";
import { JavaProjectContext } from "../context/JavaProject";
import { JavaDocument } from "../context/JavaDocument";
import { logger } from "../logger";

export default class InspectionCopilot extends Copilot {
    public static readonly DEFAULT_MODEL = { family: 'gpt-4' };
    private static readonly FORMAT_CODE = (context: JavaProjectContext, code: string) => `
    Current project uses "Java ${context.javaVersion}". please suggest improvements compatible with "Java ${context.javaVersion}" for code below.
    - Only suggest features that are available in "Java ${context.javaVersion}".
    - do not format the reponse, and do not respond markdown    
    \`\`\`java
    ${code}
    \`\`\`
    `;
    private static readonly SYSTEM_MESSAGE = `
    **You are expert at Java. You are tasked to promote new syntax and new built-in APIs of Java.** 
    Please analyze the given code to identify code that can be enhanced by using new syntax or new built-in APIs 
    of Java, and give suggestions. Keep these rules in mind:
    - Provided code is from a Java file, zero-based line numbers are added as comments (e.g., /* 0 */, /* 1 */, etc.) at the beginning of each line for reference.
    - Your suggested solutions must make use of some new syntax or built-in API of Java. that is:
        - You must only make suggestions for code that can be enhanced by using new syntax or new built-in APIs of Java
        - You must NOT make suggestions related to 3rd-party libraries/frameworks, e.g. Spring Framework, Guava, etc.
        - You must NOT make suggestions not related to new syntax or new built-in APIs of Java, e.g. code smells(such as too long method, too many parameters, etc.), code style issues, etc.
    - The suggested new syntax or new built-in APIs must be compatible with the given Java version. e.g., Text blocks feature is added in Java 15. You should not suggest it if the given Java version is 14 or below. 
    - The suggested syntax or built-in APIs must be newer than the provided code. e.g., if the given code is using Java 11 features, you can only suggest Java 12 or newer features.
    - The suggested new syntax or new built-in APIs must be introduced in Java 8 or newer versions.
    - Don't suggest improvements for commented-out code.
    - Avoid repeated suggestions for the same code block.
    - Keep scoping rules in mind. 
    - Maintain clarity, helpfulness, and thoroughness in your suggestions and keep them short and impersonal.
    - Use developer-friendly terms and analogies in your suggestions.
    - Provide suggestions in an RFC8259 compliant JSON array, each item representing a suggestion. Follow the given format strictly:
      \`\`\`
      [{
        "problem": {
          "position": {
            "startLine": "start line number of the rewritable code block",
            "endLine": "end line number of the rewritable code block"
          },
          "description": "Brief description of the issue in the code, preferably in less than 10 words, as short as possible"
        },
        "solution": "Brief description of the solution in format 'Use $name_of_the_new_syntax_or_feature ($Java_Version_this_feature_introduced)', e.g. 'Use enhanced switch expression (Java 17)', as short as possible" 
      }]
      \`\`\`
    - Reply an empty array if no suggestions can be made.
    - Avoid wrapping the whole response in triple backticks.
    - Always conclude your response with "//${Copilot.DEFAULT_END_MARK}" to indicate the end of your response.
    `;
    private static readonly EXAMPLE_USER_MESSAGE = this.FORMAT_CODE({ javaVersion: '17' },
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
    private static readonly EXAMPLE_ASSISTANT_MESSAGE =
        `[
        {
            "problem": {
                "position": { "startLine": 13, "endLine": 19 },
                "description": "Using multiple if-else"
            },
            "solution": "Use enhanced switch expression (Java 17)"
        }
    ]
    //${Copilot.DEFAULT_END_MARK}`;

    private static readonly DEFAULT_MAX_CONCURRENCIES: number = 3;

    private readonly inspecting: Set<TextDocument> = new Set<TextDocument>();

    public static readonly defaultConfig = {
        systemMessage: InspectionCopilot.SYSTEM_MESSAGE,
        exampleAssistantMessage: InspectionCopilot.EXAMPLE_ASSISTANT_MESSAGE
    };

    public constructor(
        model: LanguageModelChat,
        private readonly config: Config = InspectionCopilot.defaultConfig,
        private readonly maxConcurrencies: number = InspectionCopilot.DEFAULT_MAX_CONCURRENCIES,
    ) {
        super(model, [LanguageModelChatMessage.User(config.systemMessage)]);
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
        if (!append) {
            symbols.forEach(symbol => InspectionCache.clearInspections(document, symbol));
        }
        for (const inspection of inspections) {
            const inspectionLine = inspection.problem.position.startLine;
            let located = false;
            for (const symbol of symbols) {
                located = METHOD_KINDS.includes(symbol.kind) ?
                    // NOTE: method inspections are inspections whose `position.line` is within the method's range
                    inspectionLine >= symbol.range.start.line && inspectionLine <= symbol.range.end.line :
                    // NOTE: class/field inspections are inspections whose `position.line` is exactly the first line number of the class/field
                    inspectionLine === symbol.range.start.line;
                if (located) {
                    logger.info(`set symbol "${SymbolKind[symbol.kind]} ${symbol.qualifiedName}" for inspection: "${inspection.problem.description}"`)
                    // re-calculate `relativeLine` of method inspections, `relativeLine` is the relative line number to the start of the method
                    inspection.symbol = symbol;
                    inspection.document = document;
                    inspection.problem.position.relativeStartLine = inspection.problem.position.startLine - symbol.range.start.line;
                    inspection.problem.position.relativeEndLine = inspection.problem.position.endLine - symbol.range.start.line;
                    InspectionCache.cacheInspections(document, symbol, [inspection]);
                    break;
                }
            }
            if (!located) {
                logger.warn(`failed to locate the symbol for inspection: ${JSON.stringify(inspection, null, 2)}`);
            }
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
            const doc = await JavaDocument.from(document)
            const context = await doc.collectContext({ javaVersion: true });
            if (!context) {
                logger.warn('No context found, skipping inspection.');
                return [];
            }
            const existingInspections = await InspectionCache.getValidInspections(document);
            const existingInspectionsStr = JSON.stringify(existingInspections.map(i => {
                return {
                    problem: {
                        position: { startLine: i.problem.position.startLine, endLine: i.problem.position.endLine },
                        description: i.problem.description,
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
                    LanguageModelChatMessage.User(InspectionCopilot.FORMAT_CODE(context, linedDocumentCode)),
                    LanguageModelChatMessage.Assistant(existingInspectionsStr + `\n//${Copilot.DEFAULT_END_MARK}`),
                    LanguageModelChatMessage.User("any more?"),
                ], Copilot.DEFAULT_MODEL_OPTIONS, token);
                const rawInspections = extractInspections(rawResponse, documentCodeLines);
                // add properties for telemetry
                sendEvent('java.copilot.inspection.moreInspectionsReceived', {
                    insectionsCount: rawInspections.length,
                    inspections: rawInspections.map(i => JSON.stringify({
                        inspectionId: i.id,
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
        const documentCode: string = document.getText().trim();
        if (documentCode.length < 1) {
            logger.warn('Empty document, skipping inspection.');
            return [];
        }
        const documentCodeLines: string[] = documentCode.split(/\r?\n/);
        const linedDocumentCode = documentCodeLines
            .map((line, index) => `/* ${index} */ ${line}`)
            .filter((_, index) => index >= startLine && index <= endLine)
            .join('\n');

        const doc = await JavaDocument.from(document)
        const context = await doc.collectContext({ javaVersion: true });
        if (!context) {
            logger.warn('No context found, skipping inspection.');
            return [];
        }
        sendEvent('java.copilot.inspection.inspectingRequested', {
            javaVersion: context.javaVersion,
            codeWords: linedDocumentCode.split(/\s+/).length,
            codeLines: documentCodeLines.length,
        });
        const rawResponse = await this.send([
            LanguageModelChatMessage.User(InspectionCopilot.EXAMPLE_USER_MESSAGE),
            LanguageModelChatMessage.Assistant(this.config.exampleAssistantMessage),
            LanguageModelChatMessage.User(InspectionCopilot.FORMAT_CODE(context, linedDocumentCode))
        ], Copilot.DEFAULT_MODEL_OPTIONS, token);
        const inspections = extractInspections(rawResponse, documentCodeLines);
        // add properties for telemetry
        sendEvent('java.copilot.inspection.inspectionsReceived', {
            insectionsCount: inspections.length,
            inspections: inspections.map(i => JSON.stringify({
                inspectionId: i.id,
                problem: i.problem.description,
                solution: i.solution,
            })).join(','),
        });

        return inspections;
    }
}

export interface Config{
    systemMessage: string;
    exampleAssistantMessage: string;
}