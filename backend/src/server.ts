import { GitHubAnalyzer } from './modules/github/analyzer';
import { ResumeParser } from './modules/resume/parser';
import { ClaimVerifier } from './modules/resume/verifier';
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

// Refined GitHub API Test
app.get('/test-github/:username', async (req, res) => {
    try {
        const response = await fetch(`https://api.github.com/users/${req.params.username}/repos?per_page=100`);
        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.status}`);
        }
        const repos = await response.json() as any[];

        res.json({
            username: req.params.username,
            repoCount: repos.length,
            repos: repos.map((r: any) => ({
                name: r.name,
                stars: r.stargazers_count,
                language: r.language,
                fork: r.fork
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: 'GitHub API failed', details: error.message });
    }
});

// Refined Analyzer Route
app.post('/analyze-github', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }

        const analyzer = new GitHubAnalyzer(username);
        await analyzer.fetchRepos();

        const analysis = analyzer.getDetailedAnalysis();

        res.json({
            username,
            analysis,
            timestamp: new Date().toISOString(),
            message: 'Analysis complete - this is the brutal truth'
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
});

// Resume Verification Route
app.post('/verify-resume', async (req, res) => {
    try {
        const { username, resumeText } = req.body;

        if (!username || !resumeText) {
            return res.status(400).json({
                error: 'Both username and resumeText required'
            });
        }

        // Parse resume for claims
        const parser = new ResumeParser(resumeText);
        const claims = parser.extractClaims();

        // Fetch GitHub data
        const analyzer = new GitHubAnalyzer(username);
        await analyzer.fetchRepos();

        // Verify claims against GitHub
        const verifier = new ClaimVerifier(analyzer);
        const verificationResults = verifier.verifyAllClaims(
            claims.map(c => c.skill)
        );
        const summary = verifier.getSummary(verificationResults);

        res.json({
            username,
            totalClaimsFound: claims.length,
            verification: verificationResults,
            summary,
            brutalTruth: summary.honestyScore < 50
                ? "Your resume is mostly lies. Interviewers will catch this in 5 minutes."
                : summary.honestyScore < 70
                    ? "Too many weak claims. Build projects or remove skills."
                    : "Honest resume. Your claims match your work.",
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        res.status(500).json({
            error: 'Verification failed',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 FAB running on port ${PORT}`);
});
