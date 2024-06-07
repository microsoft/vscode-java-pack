import Copilot from "../Copilot";
import { getClassesContainedInRange, getInnermostClassContainsRange, getIntersectionSymbolsOfRange, getProjectJavaVersion, getSymbolsOfDocument, getUnionRange, logger, sendEvent } from "../utils";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, Position, Range, window, LanguageModelChatMessage } from "vscode";
import InspectionCache from "./InspectionCache";
import { SymbolNode } from "./SymbolNode";
import { randomUUID } from "crypto";

export default class InspectionCopilot extends Copilot {
    public static readonly FORMAT_CODE = (context: ProjectContext, code: string) => `
    Current project uses Java ${context.javaVersion}. please suggest improvements compatible with this version for code below (do not format the reponse, and do not respond markdown):    
    ${code}
    `;
    public static readonly SYSTEM_MESSAGE = `
    **You are expert at Java and promoting newer built-in features of Java.**
    Your identify and suggest improvements for Java code blocks that can be optimized using newer features of Java. Keep the following guidelines in mind:
    - Focus on utilizing built-in features from recent Java versions (Java 8 and onwards) to make the code more readable, efficient, and concise.
    - Do not suggest the use of third-party libraries or frameworks.
    - Comment directly on the code that can be improved. Use the following format for comments:
    \`\`\`
    other code...
    // @PROBLEM: Briefly describe the issue in the code, preferably in less than 10 words. Start with a gerund/noun word, e.g., "Using".
    // @SOLUTION: Suggest a solution to the problem in less than 10 words. Start with a verb.
    // @INDICATOR: Identify the problematic code block with a single word contained in the block. It could be a Java keyword, a method/field/variable name, or a value (e.g., magic number). Use '<null>' if cannot be identified.
    // @SEVERITY: Rate the severity of the problem as either HIGH, MIDDLE, or LOW.
    the original code that can be improved...
    \`\`\`
    - Place your comment directly above the code that needs to be improved, without making any changes to the original code.
    - Your response should be the complete original code with your added comments. Do not make any other modifications.
    - Do not comment on code that is not certain to have issues.
    - Do not comment on code that is well-written or simple enough to understand.
    - Do not add any explanations, do not format the output, and do not output markdown.
    - Conclude your response with "//${Copilot.DEFAULT_END_MARK}".
    Remember, your aim is to enhance the code, and promote the use of newer built-in Java features at the same time!
    `;
    public static readonly EXAMPLE_USER_MESSAGE = this.FORMAT_CODE({ javaVersion: '17' }, `
    @Entity
    public class EmployeePojo implements Employee {
        private final String name;
        public EmployeePojo(String name) {
            this.name = name;
        }
        public String getName() {
            return name;
        }
        public String getRole() {
            String result = "";
            if (this.name.equals("Miller")) {
                result = "Senior";
            } else if (this.name.equals("Mike")) {
                result = "HR";
            } else {
                result = "FTE";
            }
            return result;
        }
    }`);
    public static readonly EXAMPLE_ASSISTANT_MESSAGE = `
    @Entity
    // @PROBLEM: Using traditional POJO
    // @SOLUTION: Use record
    // @INDICATOR: EmployeePojo
    // @SEVERITY: MIDDLE
    public class EmployeePojo implements Employee {
        private final String name;
        public EmployeePojo(String name) {
            this.name = name;
        }
        public String getName() {
            return name;
        }
        public String getRole() {
            String result = "";
            // @PROBLEM: Using multiple if-else
            // @SOLUTION: Use enhanced switch expression
            // @INDICATOR: if
            // @SEVERITY: MIDDLE
            if (this.name.equals("Miller")) {
                result = "Senior";
            } else if (this.name.equals("Mike")) {
                result = "HR";
            } else {
                result = "FTE";
            }
            return result;
        }
    }
    //${Copilot.DEFAULT_END_MARK}
    `;

    // Initialize regex patterns
    private static readonly COMMENT_PATTERN: RegExp = /\/\/ @[A-Z]+: (.*)/;
    private static readonly PROBLEM_PATTERN: RegExp = /\/\/ @PROBLEM: (.*)/;
    private static readonly SOLUTION_PATTERN: RegExp = /\/\/ @SOLUTION: (.*)/;
    private static readonly INDICATOR_PATTERN: RegExp = /\/\/ @INDICATOR: (.*)/;
    private static readonly LEVEL_PATTERN: RegExp = /\/\/ @SEVERITY: (.*)/;
    private static readonly INSPECTION_COMMENT_LINE_COUNT = 4;

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
        const originalLines: string[] = code.split(/\r?\n/);
        // code lines without empty lines and comments
        const codeLines: { originalLineIndex: number, content: string }[] = this.extractCodeLines(originalLines)
        const codeLinesContent = codeLines.map(l => l.content).join('\n');

        if (codeLines.length < 1) {
            return Promise.resolve([]);
        }

        const codeWithInspectionComments = await this.send(InspectionCopilot.FORMAT_CODE(projectContext, codeLinesContent));
        const inspections = this.extractInspections(codeWithInspectionComments, codeLines);
        inspections.forEach(s => {
            s.document = document;
            // real line index to the start of the document
            s.problem.position.startLine = s.problem.position.relativeStartLine + startLine;
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

    /**
     * extract inspections from the code with inspection comments
     * @param codeWithInspectionComments response from the copilot, code with inspection comments 
     * @param codeLines code lines without empty lines and comments
     */
    private extractInspections(codeWithInspectionComments: string, codeLines: { originalLineIndex: number, content: string }[]): Inspection[] {
        const lines = codeWithInspectionComments.split('\n').filter(line => line.trim().length > 0);
        const inspections: Inspection[] = [];
        let commentLineCount = 0;

        for (let i = 0; i < lines.length;) {
            const commentMatch = lines[i].match(InspectionCopilot.COMMENT_PATTERN);
            if (commentMatch) {
                const inspection: Inspection | undefined = this.extractInspection(i, lines);
                if (inspection) {
                    const codeLineIndex = i - commentLineCount;
                    // relative line number to the start of the code inspected, which will be ajusted relative to the start of container symbol later when caching.
                    inspection.problem.position.relativeStartLine = codeLines[codeLineIndex].originalLineIndex ?? -1;
                    inspection.problem.position.code = codeLines[codeLineIndex].content;
                    inspections.push(inspection);
                    i += InspectionCopilot.INSPECTION_COMMENT_LINE_COUNT; // inspection comment has 4 lines
                    commentLineCount += InspectionCopilot.INSPECTION_COMMENT_LINE_COUNT;
                    continue;
                } else {
                    commentLineCount++;
                }
            }
            i++;
        }

        return inspections.filter(i => i.problem.identity.trim() !== '<null>').sort((a, b) => a.problem.position.relativeStartLine - b.problem.position.relativeStartLine);
    }

    /**
     * Extract inspection from the 4 line starting at the given index
     * @param index the index of the first line of the inspection comment
     * @param lines all lines of the code with inspection comments
     * @returns inspection object
     */
    private extractInspection(index: number, lines: string[]): Inspection | undefined {
        const problemMatch = lines[index + 0].match(InspectionCopilot.PROBLEM_PATTERN);
        const solutionMatch = lines[index + 1].match(InspectionCopilot.SOLUTION_PATTERN);
        const indicatorMatch = lines[index + 2].match(InspectionCopilot.INDICATOR_PATTERN);
        const severityMatch = lines[index + 3].match(InspectionCopilot.LEVEL_PATTERN);
        if (problemMatch && solutionMatch && indicatorMatch && severityMatch) {
            const id = randomUUID().toString();
            return {
                id,
                problem: {
                    code: id, //TODO: categorize the problem, and use the category as the code. use the id as the code for temp.
                    description: problemMatch[1].trim(),
                    position: { startLine: -1, relativeStartLine: -1, code: '' },
                    identity: indicatorMatch[1].trim()
                },
                solution: solutionMatch[1].trim(),
                severity: severityMatch[1].trim()
            };
        } else {
            logger.error('Failed to extract inspection from the lines:', lines.slice(index, index + 4));
            return undefined;
        }
    }

    /**
     * Extract code lines only without empty and comment lines
     * @param originalLines original code lines with comments and empty lines
     * @returns code lines (including line content and corresponding original line index) without empty lines and comments
     */
    private extractCodeLines(originalLines: string[]): { originalLineIndex: number, content: string }[] {
        const codeLines: { originalLineIndex: number, content: string }[] = [];
        let inBlockComment = false;
        for (let originalLineIndex = 0; originalLineIndex < originalLines.length; originalLineIndex++) {
            const trimmedLine = originalLines[originalLineIndex].trim();

            // Check for block comment start
            if (trimmedLine.startsWith('/*')) {
                inBlockComment = true;
            }

            // If we're not in a block comment, add the line to the output
            if (trimmedLine !== '' && !inBlockComment && !trimmedLine.startsWith('//')) {
                codeLines.push({ content: originalLines[originalLineIndex], originalLineIndex });
            }

            // Check for block comment end
            if (trimmedLine.endsWith('*/')) {
                inBlockComment = false;
            }
        }
        return codeLines;
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