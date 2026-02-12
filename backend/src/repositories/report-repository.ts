
import { Database } from 'sqlite';
import { DB } from '../db/database';
import { UnifiedAnalysisReport } from '../modules/analyzer/types';

export class ReportRepository {
    private db: Database | null = null;

    private async getDB(): Promise<Database> {
        if (!this.db) {
            this.db = await DB.getInstance();
            await this.ensureTable();
        }
        return this.db;
    }

    private async ensureTable() {
        if (!this.db) return;
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS analysis_reports (
                id TEXT PRIMARY KEY,
                username TEXT,
                timestamp TEXT,
                report_data TEXT, -- JSON
                status TEXT
            )
        `);
    }

    async saveReport(report: UnifiedAnalysisReport): Promise<void> {
        const db = await this.getDB();
        await db.run(
            `INSERT OR REPLACE INTO analysis_reports (id, username, timestamp, report_data, status)
             VALUES (?, ?, ?, ?, ?)`,
            [report.id, report.username, report.timestamp, JSON.stringify(report), report.status]
        );
    }

    async getReport(id: string): Promise<UnifiedAnalysisReport | null> {
        const db = await this.getDB();
        const row = await db.get('SELECT report_data FROM analysis_reports WHERE id = ?', [id]);
        if (!row) return null;
        try {
            return JSON.parse(row.report_data);
        } catch (e) {
            console.error('[ReportRepository] Failed to parse report data', e);
            return null;
        }
    }

    async getLatestReportForUser(username: string): Promise<UnifiedAnalysisReport | null> {
        const db = await this.getDB();
        const row = await db.get(
            'SELECT report_data FROM analysis_reports WHERE username = ? ORDER BY timestamp DESC LIMIT 1',
            [username]
        );
        if (!row) return null;
        return JSON.parse(row.report_data);
    }
}
