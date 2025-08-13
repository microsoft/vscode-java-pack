import { ReplacementOption } from "@vscode/extension-telemetry";

export class TelemetryFilter {
    public static hideUrlOption: ReplacementOption = {
        lookup: /https?:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, // match URLs with embedded credentials
        replacementString: "<REDACTED: sensitive-url>",
    };

    public static hideJwtTokenOption: ReplacementOption = {
        lookup: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9-_]*/,
        replacementString: "<REDACTED: JWT token>"
    }
}