import { GitHubAnalyzer } from './modules/github/analyzer';
import { ResumeParser } from './modules/resume/parser';
import { ClaimVerifier } from './modules/resume/verifier';
import { ResumeExtractor } from './modules/resume/extractor';
import { upload } from './config/upload';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Logger } from './modules/logger';
import { InterviewSessionManager } from './modules/interview/session';
import { BrainType } from './modules/llm/factory';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    Logger.request(`${req.method} ${req.url}`);

    const oldSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - start;
        Logger.debug(`${req.method} ${req.url} completed in ${duration}ms with status ${res.statusCode}`);
        return oldSend.apply(res, arguments as any);
    };

    next();
});

const sessionManager = new InterviewSessionManager();

// Brain Configuration Route
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
        const envPath = path.resolve(process.cwd(), '.env');
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
        message: 'FAB Interview System - Production Grade'
    });
});

// GitHub Analysis Endpoint (Consolidated)
app.post('/analyze-github', async (req, res) => {
    try {
        const { username, token } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });

        const analyzer = new GitHubAnalyzer(username, token);
        await analyzer.fetchRepos();
        const analysis = await analyzer.analyzeProjectsDeep(10);

        res.json({
            username,
            projectCount: analysis.length,
            projects: analysis
        });
    } catch (error: any) {
        Logger.error('GitHub Analysis Error:', error);
        res.status(500).json({ error: 'GitHub API failed', details: error.message });
    }
});

// Resume Verification Route
app.post('/verify-resume-file', upload.single('resume'), async (req, res) => {
    let filePath: string | undefined;
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { username } = req.body;
        filePath = req.file.path;

        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(filePath, req.file.mimetype);

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({ error: 'Could not extract text from file.' });
        }

        const parser = new ResumeParser(resumeText);
        const claims = await parser.extractClaims();

        let verificationResults: any[] = [];
        let summary: any = { honestyScore: 0 };

        if (username && username !== 'guest') {
            const analyzer = new GitHubAnalyzer(username);
            await analyzer.fetchRepos();
            const verifier = new ClaimVerifier(analyzer);
            verificationResults = verifier.verifyAllClaims(claims.map(c => c.skill));
            summary = verifier.getSummary(verificationResults);
        }

        await extractor.cleanup(filePath);

        res.json({
            username,
            claimsFound: claims.length,
            verification: verificationResults,
            summary,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        Logger.error('Resume Processing Error:', error);
        if (filePath) await new ResumeExtractor().cleanup(filePath);
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
});

// Interview Endpoints
app.post('/interview/start', async (req, res) => {
    try {
        const { username, context, brainType } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });

        const session = await sessionManager.createSession(
            username,
            context || { skills: [], projects: [], experience: [], githubStats: {} },
            (brainType as BrainType) || 'local'
        );

        const question = await sessionManager.getNextQuestion(session.id);

        res.json({
            sessionId: session.id,
            firstQuestion: question ? question.text : "Tell me about yourself."
        });
    } catch (error: any) {
        Logger.error('Interview Start Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/interview/answer', async (req, res) => {
    try {
        const { sessionId, answer } = req.body;
        if (!sessionId || !answer) return res.status(400).json({ error: 'Session ID and answer required' });

        const result = await sessionManager.submitAnswer(sessionId, answer);
        const nextQuestion = await sessionManager.getNextQuestion(sessionId);
        const session = sessionManager.getSession(sessionId);

        res.json({
            feedback: result.feedback,
            score: result.score,
            satisfaction: result.satisfaction,
            nextQuestion,
            done: session?.status === 'completed' || !nextQuestion
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/interview/summary/:sessionId', (req, res) => {
    try {
        const summary = sessionManager.getSessionSummary(req.params.sessionId);
        if (!summary) return res.status(404).json({ error: 'Session not found' });
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 FAB Backend running on http://localhost:${PORT}`);
});
