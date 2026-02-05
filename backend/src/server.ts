import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'FAB Interview System - Day 1'
    });
});

// GitHub API Test
app.get('/test-github/:username', async (req, res) => {
    try {
        const response = await fetch(`https://api.github.com/users/${req.params.username}/repos`);
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }
        const repos: any = await response.json();
        res.json({
            username: req.params.username,
            repoCount: repos.length,
            message: 'GitHub API working'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'GitHub API failed' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 FAB running on port ${PORT}`);
});
