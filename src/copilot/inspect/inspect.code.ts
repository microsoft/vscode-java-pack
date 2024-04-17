import { addContextProperty, instrumentSimpleOperation } from 'vscode-extension-telemetry-wrapper';
import { Inspection } from '.';
import { output } from '../output';
import { END_MARK, sendRequest } from '../sendRequest';
import { DEFAULT_JAVA_VERSION } from './utils';

const SYSTEM_MESSAGE = (version: number) => `
    You are expert at Java and code refactoring. Please identify code blocks that can be rewritten with
    new features/syntaxes/grammar sugar of Java ${version} and earlier versions to make them more **readable**,
    **efficient** and **concise** for given code.
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
    Don't add any explanation, don't format output. Don't output markdown.
    You must end your response with "//${END_MARK}".
    `;
const EXAMPLE_USER_MESSAGE = `
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
const EXAMPLE_ASSISTANT_MESSAGE = `
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
    //${END_MARK}
    `;
// Initialize regex patterns
const PROBLEM_PATTERN: RegExp = /\/\/ @PROBLEM: (.*)/;
const SOLUTION_PATTERN: RegExp = /\/\/ @SOLUTION: (.*)/;
const SYMBOL_PATTERN: RegExp = /\/\/ @SYMBOL: (.*)/;
const LEVEL_PATTERN: RegExp = /\/\/ @SEVERITY: (.*)/;

const debounceMap = new Map<string, NodeJS.Timeout>();

export function inspectCodeDebouncely(code: string, key: string, wait: number = 3000, javaVersion: number = DEFAULT_JAVA_VERSION): Promise<Inspection[]> {
    if (debounceMap.has(key)) {
        clearTimeout(debounceMap.get(key) as NodeJS.Timeout);
        output.log(`debounced`, key);
    }
    return new Promise<Inspection[]>((resolve) => {
        debounceMap.set(key, setTimeout(() => {
            void inspectCode(code, javaVersion).then(inspections => {
                debounceMap.delete(key);
                resolve(inspections);
            });
        }, wait));
    });
}

export async function inspectCode(code: string, javaVersion: number = DEFAULT_JAVA_VERSION): Promise<Inspection[]> {
    return instrumentSimpleOperation("java.copilot.inspect.code", _inspectCode)(code, javaVersion);
}

async function _inspectCode(code: string, javaVersion: number = DEFAULT_JAVA_VERSION): Promise<Inspection[]> {
    const originalLines: string[] = code.split('\n');
    const filteredLines: string[] = [];
    forEachFilteredLines(originalLines, line => filteredLines.push(line));
    const filteredLinesContent = filteredLines.join('\n');

    if (filteredLines.length < 1) {
        return Promise.resolve([]);
    }

    const messages: { role: string, content: string }[] = [
        { role: "system", content: SYSTEM_MESSAGE(javaVersion) },
        { role: "user", content: EXAMPLE_USER_MESSAGE },
        { role: "assistant", content: EXAMPLE_ASSISTANT_MESSAGE },
    ];
    const codeBlock = await sendRequest(messages, filteredLinesContent);
    const inspections = extractInspections(codeBlock);
    addContextProperty('javaVersion', javaVersion + '');
    addContextProperty('codeLength', code.length + '');
    addContextProperty('insectionsCount', inspections.length + '');
    addContextProperty('propblems', `[${inspections.map(i => i.problem.description).join(',')}]`);
    adjustCodeBlock(inspections, originalLines);
    return inspections;
}

function extractInspections(codeBlock: string): Inspection[] {
    const lines = codeBlock.split('\n').filter(line => line.trim().length > 0);
    // Initialize variables to hold the refactoring inspections and stack for nested inspections
    const inspections: Inspection[] = [];
    let commentLineCount = 0;

    for (let i = 0; i < lines.length;) {
        const line = lines[i];
        const problemMatch = line.match(PROBLEM_PATTERN);
        if (problemMatch) {
            const inspection: Inspection = extractInspection(i, lines);
            inspection.problem.position.relativeLine = i - commentLineCount;
            inspections.push(inspection);
            i += 4;
            commentLineCount += 4;
            continue;
        }
        i++;
    }

    return inspections.filter(i => i.problem.symbol.trim() !== '<null>').sort((a, b) => a.problem.position.relativeLine - b.problem.position.relativeLine);
}

function extractInspection(index: number, lines: string[]): Inspection {
    const inspection: Inspection = {
        problem: {
            description: '',
            position: { line: -1, relativeLine: -1, code: '' },
            symbol: ''
        },
        solution: '',
        severity: ''
    };
    const problemMatch = lines[index + 0].match(PROBLEM_PATTERN);
    const solutionMatch = lines[index + 1].match(SOLUTION_PATTERN);
    const symbolMatch = lines[index + 2].match(SYMBOL_PATTERN);
    const severityMatch = lines[index + 3].match(LEVEL_PATTERN);
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

function adjustCodeBlock(inspections: Inspection[], originalLines: string[]) {
    const lineIndexMap: Map<number, number> = new Map();
    inspections.forEach(inspection => {
        lineIndexMap.set(inspection.problem.position.relativeLine, -1);
    });

    // get the corresponding indexes in `originalLines` of the lines indicated by `indexes` (in `filteredLines`)
    forEachFilteredLines(originalLines, (_line, i, filteredIndex) => {
        if (lineIndexMap.has(filteredIndex)) {
            lineIndexMap.set(filteredIndex, i);
        }
    });
    // update the line numbers of the inspections
    inspections.forEach(inspection => {
        inspection.problem.position.relativeLine = lineIndexMap.get(inspection.problem.position.relativeLine) ?? -1;
        inspection.problem.position.code = originalLines[inspection.problem.position.relativeLine];
    });
}

function forEachFilteredLines(lines: string[], each: (line: string, originalIndex: number, filteredIndex: number) => void): void {
    let inBlockComment = false;
    let filteredLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();

        // Check for block comment start
        if (trimmedLine.startsWith('/*')) {
            inBlockComment = true;
        }

        // If we're not in a block comment, add the line to the output
        if (trimmedLine !== '' && !inBlockComment && !trimmedLine.startsWith('//')) {
            each(lines[i], i, filteredLineIndex);
            filteredLineIndex++;
        }

        // Check for block comment end
        if (trimmedLine.endsWith('*/')) {
            inBlockComment = false;
        }
    }
}
