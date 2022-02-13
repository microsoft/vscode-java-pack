import * as fs from "fs";
import { EOL } from "os";

interface LogEntry {
    timestamp?: number;
    entry: string;
}

interface SessionMetadata {
    importGradleAt?: number;
    importMavenAt?: number;
    initJobFinishedAt?: number;
    startAt?: number;
    initializeAt?: number;
    initializedAt?: number;
    buildJobsFinishedAt?: number;
    javaVersion?:string;
    javaVendor?:string;
}

const TIME_REGEX = /\d+-\d+-\d+ \d+:\d+:\d+\.\d+/;
const SESSION_INIDICATOR_REGEX = /!SESSION /gm;
const LOG_ENTRY_SEPARATOR = new RegExp(EOL + EOL + "(?=!ENTRY)");

const JAVA_VERSION_INDICATOR = "java.version=";
const JAVA_VENDOR_INDICATOR = "java.vendor=";

const MESSAGE_SESSION_START = "!SESSION ";
const MESSAGE_INITIALIZE = "!MESSAGE >> initialize";
const MESSAGE_INITIALIZED = "!MESSAGE >> initialized";
const MESSAGE_IMPORT_GRADLE_PROJECTS = "!MESSAGE Importing Gradle project(s)";
const MESSAGE_IMPORT_MAVEN_PROJECTS = "!MESSAGE Importing Maven project(s)";
const MESSAGE_INIT_JOB_FINISHED = "!MESSAGE >> initialization job finished";
const MESSAGE_BUILD_JOBS_FINISHED = "!MESSAGE >> build jobs finished";

export async function logsForLatestSession(logFilepath: string): Promise<string> {
    const content = await fs.promises.readFile(logFilepath, { encoding: 'utf-8' });

    let offset = 0;
    let res;
    do {
        res = SESSION_INIDICATOR_REGEX.exec(content);
        if (res) {
            offset = res.index;
        }
    } while (res !== null);

    return content.slice(offset);
}


export function sessionMetadata(log: string): SessionMetadata {
    const meta: SessionMetadata= {};
    const entries = log.split(LOG_ENTRY_SEPARATOR);

    const sessionStartEntry = entries.find(e => e.startsWith(MESSAGE_SESSION_START));
    if (sessionStartEntry) {
        const logEntry = parseTimestamp(sessionStartEntry);
        meta.startAt = logEntry.timestamp;
        for (const line of logEntry.entry.split(EOL)) {
            if (line.startsWith(JAVA_VERSION_INDICATOR)) {
                meta.javaVersion = line.slice(JAVA_VERSION_INDICATOR.length);
            }

            if (line.startsWith(JAVA_VENDOR_INDICATOR)) {
                meta.javaVendor = line.slice(JAVA_VENDOR_INDICATOR.length);
            }
        }
    }
    
    const initializeEntry = entries.find(e => e.includes(MESSAGE_INITIALIZE));
    if (initializeEntry) {
        meta.initializeAt = parseTimestamp(initializeEntry).timestamp;
    }

    const initializedEntry = entries.find(e => e.includes(MESSAGE_INITIALIZED));
    if (initializedEntry) {
        meta.initializedAt = parseTimestamp(initializedEntry).timestamp;
    }

    const gradleEntry = entries.find(e => e.includes(MESSAGE_IMPORT_GRADLE_PROJECTS));
    if (gradleEntry) {
        meta.importGradleAt = parseTimestamp(gradleEntry).timestamp;
    }

    const mavenEntry = entries.find(e => e.includes(MESSAGE_IMPORT_MAVEN_PROJECTS));
    if (mavenEntry) {
        meta.importMavenAt = parseTimestamp(mavenEntry).timestamp;
    }

    const initJobFinishedEntry = entries.find(e => e.includes(MESSAGE_INIT_JOB_FINISHED));
    if (initJobFinishedEntry) {
        meta.initJobFinishedAt = parseTimestamp(initJobFinishedEntry).timestamp;
    }

    const buildJobsFinishedEntry = entries.find(e => e.includes(MESSAGE_BUILD_JOBS_FINISHED));
    if (buildJobsFinishedEntry) {
        meta.buildJobsFinishedAt = parseTimestamp(buildJobsFinishedEntry).timestamp;
    }

    return meta;
}

export function collectErrors(log: string): LogEntry[] {
    const entries = log.split(`${EOL}${EOL}`);
    const errors = entries.filter(e => e.includes(`${EOL}!STACK `));
    return errors.map(parseTimestamp);
}

export function collectErrorsSince(log: string, timestamp: number): LogEntry[] {
    return collectErrors(log).filter((e) => e.timestamp && e.timestamp > timestamp);
}

export function parseTimestamp(entry: string): LogEntry {
    let timestamp = undefined;
    const m = entry.match(TIME_REGEX);
    if(m) {
        timestamp = (new Date(m.toString())).getTime();
    }
    return {
        timestamp,
        entry
    }

}