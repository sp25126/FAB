
import fs from 'fs/promises';
import path from 'path';

export interface InterviewRecord {
    id: string;
    username: string;
    timestamp: string; // ISO string
    score: number;
    questionsAsked: number;
    questionsAnswered: number;
    skillsTested: string[];
    redFlags: number;
    verdict: 'FAIL' | 'WEAK' | 'PASS' | 'STRONG';
    projectsFocused: string[];
    weakestSkills: string[];
    notes?: string;
}

export class HistoryStorage {
    private dataDir = path.join(process.cwd(), 'data', 'history');
    private filePath: string;

    constructor(username: string) {
        this.filePath = path.join(this.dataDir, `${username}.json`);
    }

    private async ensureDataDir(): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }
    }

    async loadHistory(): Promise<InterviewRecord[]> {
        try {
            await this.ensureDataDir();
            const data = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return []; // No history yet
        }
    }

    async saveRecord(record: InterviewRecord): Promise<void> {
        await this.ensureDataDir();
        const history = await this.loadHistory();
        history.push(record);
        await fs.writeFile(this.filePath, JSON.stringify(history, null, 2));
    }

    async getScoreProgression(): Promise<{ date: string; score: number }[]> {
        const history = await this.loadHistory();
        return history.map(r => ({ date: r.timestamp, score: r.score }));
    }

    async getProjectImpact(): Promise<Map<string, number>> {
        const history = await this.loadHistory();
        const impact = new Map<string, number>();

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            // Identify new projects discussed in this session compared to the previous one
            // This is a naive heuristic; ideally we track *which* project caused the score bump
            // For now, we assume focused projects in improved sessions contributed to the lift.
            if (curr.score > prev.score) {
                const scoreDelta = curr.score - prev.score;
                curr.projectsFocused.forEach(proj => {
                    const currentImpact = impact.get(proj) || 0;
                    impact.set(proj, currentImpact + scoreDelta);
                });
            }
        }

        return impact;
    }
}
