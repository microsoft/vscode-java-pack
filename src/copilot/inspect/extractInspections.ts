import { randomUUID } from "crypto";
import { Inspection } from "./Inspection";
import { logger } from "../logger";

export function extractInspections(rawResponse: string, codeLines: string[]): Inspection[] {
    try {
        const rawInspections: Inspection[] = JSON.parse(rawResponse);
        const validInspections = [];
        // filter out invalid inspection that miss required fields and log.
        for (let i = 0; i < rawInspections.length; i++) {
            const inspection: Inspection = rawInspections[i];
            if (!inspection.problem?.position?.startLine || !inspection.problem.description || !inspection.solution) {
                logger.warn(`Invalid inspection: ${JSON.stringify(inspection, null, 2)}`);
            } else {
                const position = inspection.problem.position;
                inspection.id = randomUUID();
                inspection.problem.code = inspection.problem.code || inspection.id;
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
        logger.warn(rawResponse);
        return [];
    }
}

function shrinkStartLineIndex(codeLines: string[], startIndex: number): number {
    let inBlockComment = false;
    for (let i = startIndex; i < codeLines.length; i++) {
        const trimmedLine = codeLines[i].trim();
        if (trimmedLine.startsWith('/*')) {
            inBlockComment = true;
        }
        if (trimmedLine.endsWith('*/')) {
            inBlockComment = false;
        }
        if (trimmedLine !== '' && !inBlockComment && !trimmedLine.startsWith('//')) {
            return i;
        }
    }
    return -1;
}

function shrinkEndLineIndex(codeLines: string[], endIndex: number): number {
    let inBlockComment = false;
    for (let i = endIndex; i >= 0; i--) {
        const trimmedLine = codeLines[i].trim();
        if (trimmedLine.endsWith('*/')) {
            inBlockComment = true;
        }
        if (trimmedLine.startsWith('/*')) {
            inBlockComment = false;
        }
        if (trimmedLine !== '' && !inBlockComment && !trimmedLine.startsWith('//')) {
            return i;
        }
    }
    return -1;
}