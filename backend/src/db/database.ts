
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

export class DB {
    private static instance: Database;

    private static async ensureDataDir(): Promise<string> {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        return dataDir;
    }

    public static async getInstance(): Promise<Database> {
        if (!DB.instance) {
            const dataDir = await DB.ensureDataDir();
            const dbPath = path.join(dataDir, 'fab.sqlite');

            DB.instance = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            await DB.initializeTables();
        }
        return DB.instance;
    }

    private static async initializeTables() {
        // Users Table
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                bio TEXT,
                experience_level TEXT,
                target_role TEXT,
                last_active DATETIME,
                avatar_url TEXT,
                github_url TEXT,
                name TEXT
            )
        `);

        // Skills Table
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT,
                level INTEGER,
                category TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        // Growth History Table (New)
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS growth_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                date DATETIME,
                metric TEXT,
                value REAL,
                details TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        // Interviews Table (for history)
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS interviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                date DATETIME,
                type TEXT,
                score INTEGER,
                feedback TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        // Projects Table (New)
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                description TEXT,
                status TEXT, -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'
                tech_stack TEXT, -- JSON
                roadmap TEXT, -- JSON
                started_at DATETIME,
                completed_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        `);

        // Analysis Reports Table
        await DB.instance.exec(`
            CREATE TABLE IF NOT EXISTS analysis_reports (
                id TEXT PRIMARY KEY,
                username TEXT,
                timestamp TEXT,
                report_data TEXT, -- JSON
                status TEXT
            )
        `);

        // This was noisy, only log it if needed
        // Logger.debug('📦 Database initialized successfully');
    }
}
