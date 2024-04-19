import { instrumentSimpleOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import Copilot from "../Copilot";
import { logger } from "../utils";
import { Inspection } from "./Inspection";

export default class InspectionCopilot extends Copilot {

    public static readonly SYSTEM_MESSAGE = `
    You are expert at Java and code refactoring. Please identify code blocks that can be rewritten with
    Java latest features/syntaxes/grammar sugars to make them more **readable**, **efficient** and **concise** for given code.
    I prefer \`Stream\` to loop, \`Optional\` to null, \`record\` to POJO, \`switch\` to if-else, etc.
    Please comment on the rewritable code directly in the original source code in the following format:
    \`\`\`
    other code...
    // @PROBLEM: problem of the code in less than 10 words, should be as short as possible, starts with a gerund/noun word, e.g., "Using".
    // @SOLUTION: solution to fix the problem in less than 10 words, should be as short as possible, starts with a verb.
    // @SYMBOL: symbol of the problematic code block, must be a single word contained by the problematic code. it's usually a Java keyword, a method/field/variable name, or a value(e.g. magic number)... but NOT multiple, '<null>' if cannot be identified
    // @SEVERITY: severity of the problem, must be one of **[HIGH, MIDDLE, LOW]**, *HIGH* for Probable bugs, Security risks, Exception handling or Resource management(e.g. memory leaks); *MIDDLE* for Error handling, Performance, Reflective accesses issues and Verbose or redundant code; *LOW* for others
    the original problematic code...
    \`\`\`
    The comment must be placed directly above the problematic code, and the problematic code must be kept unchanged.
    Your reply must be the complete original code sent to you plus your comments, without any other modifications.
    Never comment on undertermined problems.
    Never comment on code that is well-written or simple enough.
    Don't add any explanation, don't format logger. Don't output markdown.
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
        public void test(String[] arr) {
            try {
                Integer.parseInt(arr[0]);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
    `;
    public static readonly EXAMPLE_ASSISTANT_MESSAGE = `
    @Entity
    // @PROBLEM: Using a traditional POJO
    // @SOLUTION: transform into a record
    // @SYMBOL: EmployeePojo
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
            // @SYMBOL: if
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
        public void test(String[] arr) {
            try {
                Integer.parseInt(arr[0]);
            } catch (Exception e) {
                // @PROBLEM: Print stack trace in case of an exception
                // @SOLUTION: Log errors to a logger
                // @SYMBOL: ex.printStackTrace
                // @SEVERITY: LOW
                e.printStackTrace();
            }
        }
    }
    //${Copilot.DEFAULT_END_MARK}
    `;

    // Initialize regex patterns
    private static readonly PROBLEM_PATTERN: RegExp = /\/\/ @PROBLEM: (.*)/;
    private static readonly SOLUTION_PATTERN: RegExp = /\/\/ @SOLUTION: (.*)/;
    private static readonly SYMBOL_PATTERN: RegExp = /\/\/ @SYMBOL: (.*)/;
    private static readonly LEVEL_PATTERN: RegExp = /\/\/ @SEVERITY: (.*)/;

    private readonly debounceMap = new Map<string, NodeJS.Timeout>();

    public constructor() {
        const messages: { role: string, content: string }[] = [
            { role: "system", content: InspectionCopilot.SYSTEM_MESSAGE },
            { role: "user", content: InspectionCopilot.EXAMPLE_USER_MESSAGE },
            { role: "assistant", content: InspectionCopilot.EXAMPLE_ASSISTANT_MESSAGE },
        ];
        super(messages);
    }

    /**
     * inspect the given code using copilot and return the inspections
     * @param code code to inspect
     * @param key key to debounce the inspecting, if provided
     * @param wait debounce time in milliseconds, default is 3000ms
     * @returns inspections provided by copilot
     */
    public inspectCode(code: string, key?: string, wait?: number): Promise<Inspection[]> {
        const _doInspectCode: (code: string) => Promise<Inspection[]> = instrumentSimpleOperation("java.copilot.inspect.code", this.doInspectCode.bind(this));
        if (!key) { // inspect code immediately without debounce
            return _doInspectCode(code);
        }
        // inspect code with debounce if key is provided
        if (this.debounceMap.has(key)) {
            clearTimeout(this.debounceMap.get(key) as NodeJS.Timeout);
            logger.debug(`debounced`, key);
        }
        return new Promise<Inspection[]>((resolve) => {
            this.debounceMap.set(key, setTimeout(() => {
                void _doInspectCode(code).then(inspections => {
                    this.debounceMap.delete(key);
                    resolve(inspections);
                });
            }, wait ?? 0 <= 0 ? 3000 : wait));
        });
    }

    private async doInspectCode(code: string): Promise<Inspection[]> {
        const originalLines: string[] = code.split('\n');
        // code lines without empty lines and comments
        const codeLines: { originalLineIndex: number, content: string }[] = this.extractCodeLines(originalLines)
        const codeLinesContent = codeLines.map(l => l.content).join('\n');

        if (codeLines.length < 1) {
            return Promise.resolve([]);
        }

        const codeWithInspectionComments = await this.send(codeLinesContent);
        const inspections = this.extractInspections(codeWithInspectionComments, codeLines);
        // add properties for telemetry
        sendInfo('java.copilot.inspect.code', { 
            codeLength: code.length, 
            codeLines: codeLines.length, 
            insectionsCount: inspections.length, 
            propblems: `[${inspections.map(i => i.problem.description).join(',')}]` 
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
        let inspectionCommentLineCount = 0;

        for (let i = 0; i < lines.length;) {
            const problemMatch = lines[i].match(InspectionCopilot.PROBLEM_PATTERN);
            if (problemMatch) {
                const inspection: Inspection = this.extractInspection(i, lines);
                const codeLineIndex = i - inspectionCommentLineCount;
                // relative line number to the start of the code inspected, which will be ajusted relative to the start of container symbol later when caching.
                inspection.problem.position.relativeLine = codeLines[codeLineIndex].originalLineIndex ?? -1;
                inspection.problem.position.code = codeLines[codeLineIndex].content;
                inspections.push(inspection);
                i += 4; // inspection comment has 4 lines
                inspectionCommentLineCount += 4;
                continue;
            }
            i++;
        }

        return inspections.filter(i => i.problem.symbol.trim() !== '<null>').sort((a, b) => a.problem.position.relativeLine - b.problem.position.relativeLine);
    }

    /**
     * Extract inspection from the 4 line starting at the given index
     * @param index the index of the first line of the inspection comment
     * @param lines all lines of the code with inspection comments
     * @returns inspection object
     */
    private extractInspection(index: number, lines: string[]): Inspection {
        const inspection: Inspection = {
            problem: {
                description: '',
                position: { line: -1, relativeLine: -1, code: '' },
                symbol: ''
            },
            solution: '',
            severity: ''
        };
        const problemMatch = lines[index + 0].match(InspectionCopilot.PROBLEM_PATTERN);
        const solutionMatch = lines[index + 1].match(InspectionCopilot.SOLUTION_PATTERN);
        const symbolMatch = lines[index + 2].match(InspectionCopilot.SYMBOL_PATTERN);
        const severityMatch = lines[index + 3].match(InspectionCopilot.LEVEL_PATTERN);
        if (problemMatch) {
            inspection.problem.description = problemMatch[1].trim();
        }
        if (solutionMatch) {
            inspection.solution = solutionMatch[1].trim();
        }
        if (symbolMatch) {
            inspection.problem.symbol = symbolMatch[1].trim();
        }
        if (severityMatch) {
            inspection.severity = severityMatch[1].trim();
        }
        return inspection;
    }

    /**
     * Extract code lines only without empty and comment lines
     * @param originalLines original code lines with comments and empty lines
     * @returns code lines (including line content and corresponding original line index) without empty lines and comments
     */
    private extractCodeLines(originalLines: string[]): { originalLineIndex: number, content: string }[] {
        const codeLines: { originalLineIndex: number, content: string }[] = [];
        let inBlockComment = false;
        let codeLineIndex = 0;
        for (let originalLineIndex = 0; originalLineIndex < originalLines.length; originalLineIndex++) {
            const trimmedLine = originalLines[originalLineIndex].trim();

            // Check for block comment start
            if (trimmedLine.startsWith('/*')) {
                inBlockComment = true;
            }

            // If we're not in a block comment, add the line to the output
            if (trimmedLine !== '' && !inBlockComment && !trimmedLine.startsWith('//')) {
                codeLines.push({ content: originalLines[originalLineIndex], originalLineIndex });
                codeLineIndex++;
            }

            // Check for block comment end
            if (trimmedLine.endsWith('*/')) {
                inBlockComment = false;
            }
        }
        return codeLines;
    }
}