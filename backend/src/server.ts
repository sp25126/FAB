import { GitHubAnalyzer } from './modules/github/analyzer';
import { ResumeParser } from './modules/resume/parser';
import { ClaimVerifier } from './modules/resume/verifier';
import { ResumeExtractor } from './modules/resume/extractor';
import { upload } from './config/upload';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Brain Configuration Route
import fs from 'fs';
import path from 'path';

app.get('/config/brain', (req, res) => {
    try {
        const brainType = process.env.BRAIN_TYPE || 'local';
        const remoteUrl = process.env.REMOTE_BRAIN_URL || '';
        res.json({ brainType, remoteUrl });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/config/brain', (req, res) => {
    try {
        const { brainType, remoteUrl } = req.body;

        // Update .env file content
        const envPath = path.resolve(process.cwd(), '.env');

        // Simple .env rewrite (preserves other keys)
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }

        const updateKey = (key: string, value: string) => {
            const regex = new RegExp(`^${key}=.*`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        };

        if (brainType) updateKey('BRAIN_TYPE', brainType);
        if (remoteUrl) updateKey('REMOTE_BRAIN_URL', remoteUrl);

        fs.writeFileSync(envPath, envContent.trim() + '\n');

        // Force reload of dotenv in this process if needed, but for now just updating file
        // Ideally we might reload process.env here too for immediate effect without restart
        if (brainType) process.env.BRAIN_TYPE = brainType;
        if (remoteUrl) process.env.REMOTE_BRAIN_URL = remoteUrl;

        res.json({ success: true, message: 'Brain config updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

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
        const claims = await parser.extractClaims();

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

// File upload endpoint
app.post('/verify-resume-file', upload.single('resume'), async (req, res) => {
    let filePath: string | undefined;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'GitHub username required' });
        }

        filePath = req.file.path;

        // Extract text from file
        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(filePath, req.file.mimetype);

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({
                error: 'Could not extract text from file. File may be empty or corrupted.'
            });
        }

        // Parse resume for claims
        const parser = new ResumeParser(resumeText);
        const claims = await parser.extractClaims();

        console.log(`[LOG] Parsed ${claims.length} claims from resume`);
        fs.appendFileSync(path.resolve(process.cwd(), '../logs/backend.log'),
            `[${new Date().toISOString()}] Parsed ${claims.length} claims | Brain: ${process.env.BRAIN_TYPE}\n`);

        // GitHub verification (OPTIONAL - graceful fallback)
        let verificationResults: any[] = [];
        let summary = {
            totalClaims: claims.length,
            verified: 0,
            weakSupport: 0,
            overclaimed: claims.length,
            honestyScore: claims.length > 0 ? 50 : 0,
            risk: 'MEDIUM' as string
        };

        try {
            if (username && username !== 'fab_gui_user' && username !== 'gui_user') {
                console.log(`[LOG] Attempting GitHub verification for: ${username}`);
                const analyzer = new GitHubAnalyzer(username);
                await analyzer.fetchRepos();

                const verifier = new ClaimVerifier(analyzer);
                verificationResults = verifier.verifyAllClaims(claims.map(c => c.skill));
                summary = verifier.getSummary(verificationResults);
                console.log(`[LOG] GitHub verification complete. Score: ${summary.honestyScore}`);
            } else {
                console.log(`[LOG] Skipping GitHub verification (no valid username)`);
            }
        } catch (ghError: any) {
            console.warn(`[WARN] GitHub verification failed: ${ghError.message}. Using resume-only analysis.`);
            fs.appendFileSync(path.resolve(process.cwd(), '../logs/backend.log'),
                `[${new Date().toISOString()}] GitHub Error: ${ghError.message}\n`);
        }

        // Cleanup uploaded file
        await extractor.cleanup(filePath);

        const brutalTruth = claims.length === 0
            ? "No skills were extracted. Your resume may be formatted poorly or the AI brain failed."
            : summary.honestyScore < 50
                ? "Your resume is mostly lies. Interviewers will catch this in 5 minutes."
                : summary.honestyScore < 70
                    ? "Too many weak claims. Build projects or remove skills."
                    : "Honest resume. Your claims match your work.";

        fs.appendFileSync(path.resolve(process.cwd(), '../logs/backend.log'),
            `[${new Date().toISOString()}] Result: ${claims.length} claims, Score: ${summary.honestyScore}\n`);

        res.json({
            username,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            extractedTextLength: resumeText.length,
            claimsFound: claims.length,
            verification: verificationResults,
            summary,
            brutalTruth,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        // Log error
        console.error(`[ERROR] ${error.message}`);
        fs.appendFileSync(path.resolve(process.cwd(), '../logs/backend.log'),
            `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`);

        // Cleanup on error
        if (filePath) {
            const extractor = new ResumeExtractor();
            await extractor.cleanup(filePath);
        }

        res.status(500).json({
            error: 'File processing failed',
            details: error.message
        });
    }
});

// Debug extraction endpoint
app.post('/debug-extract', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(req.file.path, req.file.mimetype);

        await extractor.cleanup(req.file.path);

        res.json({
            extractedText: resumeText,
            textLength: resumeText.length,
            lowercase: resumeText.toLowerCase(),
            // Cleaned preview
            cleanedPreview: resumeText.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim().substring(0, 500)
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 FAB running on port ${PORT}`);
});
