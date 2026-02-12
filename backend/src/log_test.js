
// 2026-02 - 10: Created log_test.js to satisfy Acceptance Criteria 1 & 2 & 3
const http = require('http');
const fs = require('fs');
const path = require('path');

// Clean old logs for testing
const logDir = path.resolve(__dirname, '../logs');
if (fs.existsSync(logDir)) {
    // Only delete today's combined log to force a fresh start
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `combined-${today}.log`);
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
}

const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            res.on('data', () => { }); // Consume
            res.on('end', resolve);
        });
        req.on('error', reject);
        req.end();
    });
};

const runTest = async () => {
    console.log("Starting load test...");
    // Hit health 50 times
    for (let i = 0; i < 50; i++) {
        await makeRequest('/health');
    }
    console.log("50 requests completed.");

    // Check logs
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `combined-${today}.log`);

    // Wait for flush
    setTimeout(() => {
        if (!fs.existsSync(logFile)) {
            console.error("Log file not found!");
            process.exit(1);
        }

        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.trim().split('\n');

        console.log(`Log lines count: ${lines.length}`);

        // Grep for secrets
        const secrets = ["ghp_", "Authorization", "clientsecret", "code="];
        let foundSecret = false;
        secrets.forEach(s => {
            if (content.includes(s)) {
                console.error(`SECRET LEAK FOUND: ${s}`);
                foundSecret = true;
            }
        });

        if (!foundSecret) {
            console.log("No secrets found in logs.");
        } else {
            process.exit(1);
        }

        // Check for debug spam (in prod, we expect INFO only)
        // Assuming we look for "level":"debug" in json
        if (content.includes('"level":"debug"')) {
            console.warn("WARNING: Debug logs found in output (env might not be production?)");
        } else {
            console.log("Clean info-only logs verified.");
        }

    }, 2000);
};

runTest();
