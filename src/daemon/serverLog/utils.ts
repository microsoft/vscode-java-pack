
export function toElapsed(start?: number, end?: number) {
    if (start && end) {
        return end - start;
    } else {
        return undefined;
    }
}