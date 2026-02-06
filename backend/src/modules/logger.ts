
import fs from 'fs';
import path from 'path';

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
    REQUEST = 'REQ'
}

export class Logger {
    private static logFile: string;

    static initialize() {
        const logDir = path.resolve(process.cwd(), '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        this.logFile = path.join(logDir, 'backend.log');
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
        const colors = {
            [LogLevel.INFO]: '\x1b[36m', // Cyan
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.DEBUG]: '\x1b[90m', // Gray
            [LogLevel.REQUEST]: '\x1b[35m' // Magenta
        };
        const reset = '\x1b[0m';

        console.log(`${colors[level]}[${level}]${reset} ${message}`);
        if (meta && level === LogLevel.ERROR) console.error(meta);

        // File output
        fs.appendFileSync(this.logFile, formatted + '\n');
    }

    static info(message: string, meta?: any) { this.log(LogLevel.INFO, message, meta); }
    static warn(message: string, meta?: any) { this.log(LogLevel.WARN, message, meta); }
    static error(message: string, error?: any) { this.log(LogLevel.ERROR, message, error); }
    static debug(message: string, meta?: any) { this.log(LogLevel.DEBUG, message, meta); }
    static request(message: string, meta?: any) { this.log(LogLevel.REQUEST, message, meta); }
}

// Initialize immediately
Logger.initialize();
