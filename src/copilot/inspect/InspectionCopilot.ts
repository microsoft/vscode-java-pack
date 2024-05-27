import { sendInfo } from "vscode-extension-telemetry-wrapper";
import Copilot from "../Copilot";
import { fixedInstrumentSimpleOperation, getClassesContainedInRange, getInnermostClassContainsRange, getIntersectionMethodsOfRange, getProjectJavaVersion, getUnionRange, logger } from "../utils";
import { Inspection } from "./Inspection";
import { TextDocument, SymbolKind, ProgressLocation, commands, Position, Range, Selection, window, LanguageModelChatMessage } from "vscode";
import { COMMAND_FIX_INSPECTION } from "./commands";
import InspectionCache from "./InspectionCache";
import { SymbolNode } from "./SymbolNode";
import { randomUUID } from "crypto";

export default class InspectionCopilot extends Copilot {

    public static readonly SYSTEM_MESSAGE = (context: ProjectContext) => `
    **You are expert at Java and promoting new features of Java.**
    Each Java version has added some new language features or syntaxes to make the code **more readable, efficient, and concise**. e.g. 
    Java 8 added lambda expressions, Stream, Optional API, and also a set of functional style APIs for collections...;
    Java 9 added new operation for Collections, Stream, and Optional APIs. and also brought a new HTTPClient...;
    Java 10 introduced var type inference, and also added some new APIs for Collections...;
    Java 11 - 21 added..., etc.
    Please identify code blocks that can be rewritten with these new features of Java itself for given code.
    Dont't suggest using third-party libraries or frameworks, only suggest using the new features of Java itself.
    Becareful that current project uses Java ${context.javaVersion}, and the solution you provide **must** be compatible with this version.
    Please comment on the rewritable code directly in the original source code in the following format:
    \`\`\`
    other code...
    // @PROBLEM: problem of the code in less than 10 words, should be as short as possible, starts with a gerund/noun word, e.g., "Using".
    // @SOLUTION: solution to fix the problem in less than 10 words, should be as short as possible, starts with a verb.
    // @INDICATOR: indicator of the rewriteable code block, must be a single word contained by the rewriteable code. it's usually a Java keyword, a method/field/variable name, or a value(e.g. magic number)... but NOT multiple, '<null>' if cannot be identified
    // @SEVERITY: severity of the problem, must be one of **[HIGH, MIDDLE, LOW]**
    the original rewriteable code...
    \`\`\`
    The comment must be placed directly above the rewriteable code, and the rewriteable code must be kept unchanged.
    Your reply must be the complete original code sent to you plus your comments, without any other modifications.
    Never comment on undertermined problems.
    Never comment on code that is well-written or simple enough.
    Don't add any explanation, don't format output. Don't output markdown.
    You must end your response with "//${Copilot.DEFAULT_END_MARK}".
    `;
    public static readonly EXAMPLE_USER_MESSAGE = `
    @Entity
    public class EmployeePojo implements Employee {
        public final String name;
        public EmployeePojo(String name) {
            this.name = name;
        }
        public String getRole() {
            String result = '';
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
    `;
    public static readonly EXAMPLE_ASSISTANT_MESSAGE = `
    @Entity
    // @PROBLEM: Using a traditional POJO
    // @SOLUTION: transform into a record
    // @INDICATOR: EmployeePojo
    // @SEVERITY: MIDDLE
    public class EmployeePojo implements Employee {
        public final String name;
        public EmployeePojo(String name) {
            this.name = name;
        }
        public String getRole() {
            String result = '';
            // @PROBLEM: Using if-else statements to check the type of animal
            // @SOLUTION: Use switch expression
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

    private readonly debounceMap = new Map<string, NodeJS.Timeout>();
    private readonly inspecting: Set<TextDocument> = new Set<TextDocument>();

    public constructor(
        private readonly maxConcurrencies: number = InspectionCopilot.DEFAULT_MAX_CONCURRENCIES,
    ) {
        super();
    }

    public get busy(): boolean {
        return this.inspecting.size >= this.maxConcurrencies;
    }

    public async inspectDocument(document: TextDocument): Promise<Inspection[]> {
        logger.info('inspecting document:', document.fileName);
        const range = new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end);
        return this.inspectRange(document, range);
    }

    public async inspectClass(document: TextDocument, clazz: SymbolNode): Promise<Inspection[]> {
        logger.info('inspecting class:', clazz.qualifiedName);
        return this.inspectRange(document, clazz.range);
    }

    public async inspectSymbol(document: TextDocument, symbol: SymbolNode): Promise<Inspection[]> {
        logger.info(`inspecting symbol ${SymbolKind[symbol.kind]} ${symbol.qualifiedName}`);
        return this.inspectRange(document, symbol.range);
    }

    public async inspectRange(document: TextDocument, range: Range | Selection): Promise<Inspection[]> {
        if (this.busy) {
            logger.warn('Copilot is busy, please retry after current inspecting tasks is finished.');
            void window.showWarningMessage(`Copilot is busy, please retry after current inspecting tasks are finished.`);
            return Promise.resolve([]);
        }
        if (this.inspecting.has(document)) {
            return Promise.resolve([]);
        }
        try {
            this.inspecting.add(document);
            // ajust the range to the minimal container class or (multiple) method symbols
            const methods: SymbolNode[] = await getIntersectionMethodsOfRange(range, document);
            const classes: SymbolNode[] = await getClassesContainedInRange(range, document);
            const symbols: SymbolNode[] = [...classes, ...methods];
            if (symbols.length < 1) {
                const containingClass: SymbolNode = await getInnermostClassContainsRange(range, document);
                symbols.push(containingClass);
            }

            // get the union range of the container symbols, which will be insepcted by copilot
            const expandedRange: Range = getUnionRange(symbols);

            // inspect the expanded union range
            const symbolName = symbols[0].symbol.name;
            const symbolKind = SymbolKind[symbols[0].kind].toLowerCase();
            const target = symbols.length > 1 ? `${symbolKind} ${symbolName}, etc.` : `${symbolKind} ${symbolName}`;
            const inspections = await window.withProgress({
                location: ProgressLocation.Notification,
                title: `Inspecting ${target}...`,
                cancellable: false
            }, (_progress) => {
                return this.doInspectRange(document, expandedRange);
            });

            // show message based on the number of inspections
            if (inspections.length < 1) {
                void window.showInformationMessage(`Inspected ${target}, and got 0 suggestions.`);
            } else if (inspections.length == 1) {
                // apply the only suggestion automatically
                void commands.executeCommand(COMMAND_FIX_INSPECTION, inspections[0], 'auto');
            } else {
                // show message to go to the first suggestion
                // inspected a, ..., etc. and got n suggestions.
                void window.showInformationMessage(`Inspected ${target}, and got ${inspections.length} suggestions.`, "Go to").then(selection => {
                    selection === "Go to" && void Inspection.revealFirstLineOfInspection(inspections[0]);
                });
            }
            InspectionCache.cache(document, symbols, inspections);
            return inspections;
        } finally {
            this.inspecting.delete(document);
        }
    }

    /**
     * inspect the given code (debouncely if `key` is provided) using copilot and return the inspections
     * @param code code to inspect
     * @param key key to debounce the inspecting, which is used to support multiple debouncing. Consider 
     *  the case that we have multiple documents, and we only want to debounce the method calls on the 
     *  same document (identified by `key`).
     * @param wait debounce time in milliseconds, default is 3000ms
     * @returns inspections provided by copilot
     */
    public inspectCode(code: string, context: ProjectContext, key?: string, wait: number = 3000): Promise<Inspection[]> {
        const _doInspectCode: (code: string, context: ProjectContext) => Promise<Inspection[]> = fixedInstrumentSimpleOperation("java.copilot.inspect.code", this.doInspectCode.bind(this));
        if (!key) { // inspect code immediately without debounce
            return this.doInspectCode(code, context);
        }
        // inspect code with debounce if key is provided
        if (this.debounceMap.has(key)) {
            clearTimeout(this.debounceMap.get(key) as NodeJS.Timeout);
            logger.debug(`debounced`, key);
        }
        return new Promise<Inspection[]>((resolve) => {
            this.debounceMap.set(key, setTimeout(() => {
                void _doInspectCode(code, context).then(inspections => {
                    this.debounceMap.delete(key);
                    resolve(inspections);
                });
            }, wait <= 0 ? 3000 : wait));
        });
    }

    private async doInspectRange(document: TextDocument, range: Range | Selection): Promise<Inspection[]> {
        const adjustedRange = new Range(new Position(range.start.line, 0), new Position(range.end.line, document.lineAt(range.end.line).text.length));
        const content: string = document.getText(adjustedRange);
        const startLine = range.start.line;
        const projectContext = await this.collectProjectContext(document);
        const inspections = await this.inspectCode(content, projectContext);
        inspections.forEach(s => {
            s.document = document;
            // real line index to the start of the document
            s.problem.position.line = s.problem.position.relativeLine + startLine;
        });
        return inspections;
    }

    private async doInspectCode(code: string, context: ProjectContext): Promise<Inspection[]> {
        const originalLines: string[] = code.split(/\r?\n/);
        // code lines without empty lines and comments
        const codeLines: { originalLineIndex: number, content: string }[] = this.extractCodeLines(originalLines)
        const codeLinesContent = codeLines.map(l => l.content).join('\n');

        if (codeLines.length < 1) {
            return Promise.resolve([]);
        }

        const messages: LanguageModelChatMessage[] = [
            LanguageModelChatMessage.User(InspectionCopilot.SYSTEM_MESSAGE(context)),
            LanguageModelChatMessage.User(InspectionCopilot.EXAMPLE_USER_MESSAGE),
            LanguageModelChatMessage.Assistant(InspectionCopilot.EXAMPLE_ASSISTANT_MESSAGE),
        ];
        const codeWithInspectionComments = await this.send(messages, codeLinesContent);
        const inspections = this.extractInspections(codeWithInspectionComments, codeLines);
        // add properties for telemetry
        sendInfo('java.copilot.inspect.code', {
            javaVersion: context.javaVersion,
            codeLength: code.length,
            codeLines: codeLines.length,
            insectionsCount: inspections.length,
            inspections: `[${inspections.map(i => JSON.stringify({
                problem: i.problem.description,
                solution: i.solution,
            })).join(',')}]`,
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
                    inspection.problem.position.relativeLine = codeLines[codeLineIndex].originalLineIndex ?? -1;
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

        return inspections.filter(i => i.problem.indicator.trim() !== '<null>').sort((a, b) => a.problem.position.relativeLine - b.problem.position.relativeLine);
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
            return {
                id: randomUUID().toString(),
                problem: {
                    description: problemMatch[1].trim(),
                    position: { line: -1, relativeLine: -1, code: '' },
                    indicator: indicatorMatch[1].trim()
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
        logger.info('colleteting project context info (java version)...');
        const javaVersion = await getProjectJavaVersion(document);
        logger.info('project java version:', javaVersion);
        return { javaVersion };
    }
}

export interface ProjectContext {
    javaVersion: string;
}