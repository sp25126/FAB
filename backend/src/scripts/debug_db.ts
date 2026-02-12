
import { DB } from '../db/database';

async function run() {
    try {
        const db = await DB.getInstance();
        console.log('--- USERS ---');
        const users = await db.all('SELECT id, username, bio FROM users');
        console.table(users);

        console.log('\n--- ANALYSIS REPORTS ---');
        const reports = await db.all('SELECT id, username, timestamp, LENGTH(report_data) as data_len FROM analysis_reports ORDER BY timestamp DESC LIMIT 5');
        console.table(reports);

        if (reports.length > 0) {
            console.log('\n--- LATEST REPORT SAMPLE ---');
            const latest = await db.get('SELECT username, report_data FROM analysis_reports ORDER BY timestamp DESC LIMIT 1');
            console.log('Report owner:', latest.username);
            const data = JSON.parse(latest.report_data);
            console.log('Insights Keys:', data.insights ? Object.keys(data.insights) : 'MISSING');
            if (data.insights) {
                console.log('Strengths:', data.insights.strengths);
                console.log('Recommendations:', data.insights.recommendations);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
