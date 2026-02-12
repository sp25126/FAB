import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug',
    REQUEST = 'info', // Map to info for production consistency
    BRAIN = 'info',
    LLM = 'info'
}

// Sensitive keys to redact
const SENSITIVE_KEYS = [
    'token', 'access_token', 'authorization', 'code',
    'secret', 'password', 'client_secret', 'GITHUB_CLIENT_SECRET',
    'GITHUB_CLIENT_ID', 'cookie', 'set-cookie'
];

/**
 * Recursively redacts sensitive keys from an object or string
 */
const sanitize = (val: any): any => {
    if (typeof val !== 'object' || val === null) {
        if (typeof val === 'string') {
            // Check for common patterns if needed, but primarily key-based
            return val;
        }
        return val;
    }

    if (Array.isArray(val)) {
        return val.map(sanitize);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(val)) {
        if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = sanitize(value);
        }
    }
    return sanitized;
};

const redactFormat = winston.format((info) => {
    const { message, ...meta } = info;

    // Sanitize message if it's a string (regex-based for common patterns)
    if (typeof message === 'string') {
        let sanitizedMessage = message;
        // Example: sanitize ghp_ tokens in message strings
        sanitizedMessage = sanitizedMessage.replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_TOKEN]');
        info.message = sanitizedMessage;
    }

    // Sanitize metadata
    const sanitizedMeta = sanitize(meta);
    Object.assign(info, sanitizedMeta);

    return info;
});

const logDir = path.resolve(process.cwd(), '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
                return `${timestamp} ${level}: ${message}${metaStr}`;
            })
        ),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }),

    // Combined log rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info'
    }),

    // Error log rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error'
    }),

    // Brain/LLM specific rotation
    new DailyRotateFile({
        filename: path.join(logDir, 'brain-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        level: 'info' // We filter this in the transport or using multiple loggers
    })
];

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: winston.format.combine(
        winston.format.timestamp(),
        redactFormat(),
        process.env.NODE_ENV === 'production' ? winston.format.json() : winston.format.prettyPrint()
    ),
    transports
});

export class Logger {
    private static currentBrainType: string = 'unknown';

    static info(message: string, meta?: any) {
        logger.info(message, meta);
    }

    static warn(message: string, meta?: any) {
        logger.warn(message, meta);
    }

    static error(message: string, error?: any) {
        if (error instanceof Error) {
            logger.error(message, {
                error: error.message,
                stack: error.stack,
                ...((error as any).meta || {})
            });
        } else {
            logger.error(message, error);
        }
    }

    static debug(message: string, meta?: any) {
        logger.debug(message, meta);
    }

    static request(message: string, meta?: any) {
        // High-level request logging
        logger.info(`[REQ] ${message}`, meta);
    }

    static setBrainType(brainType: string) {
        this.currentBrainType = brainType;
        logger.info(`Brain Type Set: ${brainType}`);
    }

    static brain(message: string, meta?: any) {
        logger.info(`[BRAIN] [${this.currentBrainType.toUpperCase()}] ${message}`, meta);
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
        logger.info(`[LLM] Inference: ${endpoint} completed in ${timeMs}ms`, meta);
    }

    static githubApi(endpoint: string, status: number, timeMs: number) {
        logger.info(`[GITHUB] API: ${endpoint} [${status}] ${timeMs}ms`);
    }

    // Helper for correlation IDs
    static withRequest(requestId: string) {
        return logger.child({ requestId });
    }
}
