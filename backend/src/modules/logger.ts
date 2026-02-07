
import fs from 'fs';
import path from 'path';

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
    REQUEST = 'REQ',
    BRAIN = 'BRAIN',
    LLM = 'LLM'
}

export class Logger {
    private static logFile: string;
    private static brainFile: string;
    private static currentBrainType: string = 'unknown';

    static initialize() {
        const logDir = path.resolve(process.cwd(), '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        this.logFile = path.join(logDir, 'backend.log');
        this.brainFile = path.join(logDir, 'brain_inference.log');
    }

    private static formatMessage(level: LogLevel, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        let logMsg = `[${timestamp}] [${level}] ${message}`;
        if (meta) {
            if (meta instanceof Error) {
                logMsg += `\nStack: ${meta.stack}`;
            } else {
                logMsg += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
            }
        }
        return logMsg;
    }

    static log(level: LogLevel, message: string, meta?: any) {
        if (!this.logFile) this.initialize();

        const formatted = this.formatMessage(level, message, meta);

        // Console output (with colors)
        const colors: { [key: string]: string } = {
            [LogLevel.INFO]: '\x1b[36m', // Cyan
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.DEBUG]: '\x1b[90m', // Gray
            [LogLevel.REQUEST]: '\x1b[35m', // Magenta
            [LogLevel.BRAIN]: '\x1b[95m', // Bright Magenta
            [LogLevel.LLM]: '\x1b[96m' // Bright Cyan
        };
        const reset = '\x1b[0m';

        console.log(`${colors[level] || ''}[${level}]${reset} ${message}`);
        if (meta && level === LogLevel.ERROR) console.error(meta);

        // File output
        fs.appendFileSync(this.logFile, formatted + '\n');

        // Also write brain-related logs to brain file
        if (level === LogLevel.BRAIN || level === LogLevel.LLM) {
            fs.appendFileSync(this.brainFile, formatted + '\n');
        }
    }

    static info(message: string, meta?: any) { this.log(LogLevel.INFO, message, meta); }
    static warn(message: string, meta?: any) { this.log(LogLevel.WARN, message, meta); }
    static error(message: string, error?: any) { this.log(LogLevel.ERROR, message, error); }
    static debug(message: string, meta?: any) { this.log(LogLevel.DEBUG, message, meta); }
    static request(message: string, meta?: any) { this.log(LogLevel.REQUEST, message, meta); }

    // Brain-specific logging
    static setBrainType(brainType: string) {
        this.currentBrainType = brainType;
        this.log(LogLevel.BRAIN, `Brain Type Set: ${brainType}`);
    }

    static brain(message: string, meta?: any) {
        const fullMessage = `[${this.currentBrainType.toUpperCase()}] ${message}`;
        this.log(LogLevel.BRAIN, fullMessage, meta);
    }

    static llmInference(endpoint: string, timeMs: number, tokensIn?: number, tokensOut?: number) {
        const meta = {
            brain: this.currentBrainType,
            endpoint,
            timeMs,
            tokensIn: tokensIn || 'N/A',
            tokensOut: tokensOut || 'N/A',
            tokensPerSec: tokensOut && timeMs > 0 ? Math.round(tokensOut / (timeMs / 1000)) : 'N/A'
        };
        this.log(LogLevel.LLM, `Inference: ${endpoint} completed in ${timeMs}ms`, meta);
    }

    static githubApi(endpoint: string, status: number, timeMs: number) {
        this.log(LogLevel.INFO, `GitHub API: ${endpoint} [${status}] ${timeMs}ms`);
    }
}

// Initialize immediately
Logger.initialize();
