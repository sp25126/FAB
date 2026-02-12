
import { DB } from '../db/database';

async function seedGrowth() {
    try {
        const db = await DB.getInstance();
        const username = 'sp25126';

        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            console.log('User not found!');
            return;
        }

        // 1. Seed Interview
        console.log('Seeding Interview...');
        const interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() - 1); // Yesterday
        const details = JSON.stringify({
            sessionId: 'mock_session_1',
            verdict: 'PASS',
            topics: ['React', 'System Design', 'Node.js']
        });

        await db.run(
            'INSERT INTO growth_history (user_id, date, metric, value, details) VALUES (?, ?, ?, ?, ?)',
            [user.id, interviewDate.toISOString(), 'interview_score', 85, details]
        );

        // 2. Seed Active Challenge
        console.log('Seeding Active Challenge...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 2);

        const techStack = JSON.stringify(['TypeScript', 'PostgreSQL', 'Redis']);
        const roadmap = JSON.stringify({
            phases: [
                { name: "Design Schema", status: "completed" },
                { name: "API Implementation", status: "in_progress" }
            ]
        });

        await db.run(
            `INSERT INTO projects (user_id, title, description, status, tech_stack, started_at, roadmap)
             VALUES (?, ?, ?, 'STARTED', ?, ?, ?)`,
            [
                user.id,
                'High-Scale Event Ingestion',
                'Design and implement a system to ingest 10k events/sec using Node.js streams and Redis queue.',
                techStack,
                startDate.toISOString(),
                roadmap
            ]
        );

        console.log('Seed complete!');

    } catch (e) {
        console.error(e);
    }
}

seedGrowth();
