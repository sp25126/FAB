
import { DB } from '../db/database';

async function checkGrowth() {
    try {
        const db = await DB.getInstance();
        const username = 'sp25126'; // Default user
        console.log(`Checking data for ${username}...`);

        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            console.log('User not found!');
            return;
        }

        const growth = await db.all('SELECT * FROM growth_history WHERE user_id = ?', [user.id]);
        console.log(`Growth History: ${growth.length} entries`);
        if (growth.length > 0) {
            console.log('Sample:', growth[0]);
        }

        const startedProjects = await db.all("SELECT * FROM projects WHERE user_id = ? AND status = 'STARTED'", [user.id]);
        console.log(`Active Challenges: ${startedProjects.length}`);
        if (startedProjects.length > 0) {
            console.log('Sample:', startedProjects[0]);
        }

        const allProjects = await db.all("SELECT * FROM projects WHERE user_id = ?", [user.id]);
        console.log(`Total Projects: ${allProjects.length}`);

    } catch (e) {
        console.error(e);
    }
}

checkGrowth();
