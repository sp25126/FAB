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
import { AIQuestioner } from './modules/interview/ai-questioner';
import { BrainType } from './modules/llm/factory';
import multer from 'multer';
import { HistoryStorage } from './modules/history/storage';

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

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'online' });
});

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
        if (!username) {
            res.status(400).json({ error: 'Username required' });
            return;
        }

        const analyzer = new GitHubAnalyzer(username, token);
        await analyzer.fetchRepos();

        // Conditional analysis: Deep with token, Light without
        let analysis;
        if (token) {
            console.log('[Server] Token provided - Using DEEP analysis (10 projects)');
            analysis = await analyzer.analyzeProjectsDeep(10);
        } else {
            console.log('[Server] No token - Using LIGHT analysis (10 projects, basic metadata only)');
            analysis = await analyzer.analyzeProjectsLight(10);
        }

        if (analysis.length === 0 && analyzer.lastError) {
            res.status(400).json({ error: analyzer.lastError });
            return;
        }

        res.json({
            username,
            projectCount: analysis.length,
            analysisMode: token ? 'DEEP' : 'LIGHT',
            projects: analysis
        });
    } catch (error: any) {
        Logger.error('GitHub Analysis Error:', error);
        res.status(500).json({ error: 'GitHub API failed', details: error.message });
        return;
    }
});

// Resume Verification Route
app.post('/verify-resume-file', upload.single('resume'), async (req, res) => {
    let filePath: string | undefined;
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const { username } = req.body;
        filePath = req.file.path;

        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(filePath, req.file.mimetype);

        if (!resumeText || resumeText.trim().length === 0) {
            res.status(400).json({ error: 'Could not extract text from file.' });
            return;
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
            summary, // Honesty summary
            resumeBio: parser.getEnhancedData()?.summary || "", // Resume bio
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
        const { username, context, brainType, enableTraining } = req.body;
        if (!username) {
            res.status(400).json({ error: 'Username required' });
            return;
        }

        const finalContext = context || { skills: [], projects: [], experience: [], githubStats: {} };

        if (enableTraining) {
            const storage = new HistoryStorage(username);
            const history = await storage.loadHistory();
            const recentHistory = history.slice(-5);
            const weaknesses = new Set<string>();
            recentHistory.forEach(h => h.weakestSkills.forEach(s => weaknesses.add(s)));

            if (weaknesses.size > 0) {
                finalContext.weaknesses = Array.from(weaknesses).slice(0, 5);
            }
        }

        const session = await sessionManager.createSession(
            username,
            finalContext,
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
        if (!sessionId || !answer) {
            res.status(400).json({ error: 'Session ID and answer required' });
            return;
        }

        const result = await sessionManager.submitAnswer(sessionId, answer);
        const nextQuestion = await sessionManager.getNextQuestion(sessionId);
        const session = sessionManager.getSession(sessionId);

        const done = session?.status === 'completed' || !nextQuestion;

        if (done) {
            // Persist history
            await sessionManager.completeSession(sessionId);
        }

        res.json({
            feedback: result.feedback,
            score: result.score,
            satisfaction: result.satisfaction,
            nextQuestion,
            done
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/interview/summary/:sessionId', (req, res) => {
    try {
        const summary = sessionManager.getSessionSummary(req.params.sessionId);
        if (!summary) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Growth Dashboard Endpoints

// Get score progression
app.get('/progress/:username', async (req, res) => {
    try {
        const storage = new HistoryStorage(req.params.username);
        const progression = await storage.getScoreProgression();

        // Safety check for empty progression
        const currentScore = progression.length > 0 ? progression[progression.length - 1].score : 0;
        const firstScore = progression.length > 0 ? progression[0].score : 0;

        res.json({
            username: req.params.username,
            totalInterviews: progression.length,
            scores: progression,
            currentScore,
            firstScore,
            improvement: progression.length > 1 ? currentScore - firstScore : 0
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get project impact
app.get('/progress/:username/projects', async (req, res) => {
    try {
        const storage = new HistoryStorage(req.params.username);
        const impact = await storage.getProjectImpact();

        const projects = Array.from(impact.entries()).map(([name, delta]) => ({
            name,
            scoreImpact: delta,
            verdict: delta > 15 ? 'HIGH_IMPACT' : delta > 5 ? 'MEDIUM_IMPACT' : 'LOW_IMPACT'
        })).sort((a, b) => b.scoreImpact - a.scoreImpact);

        res.json({ projects });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get next recommended action
app.get('/progress/:username/next-action', async (req, res) => {
    try {
        const storage = new HistoryStorage(req.params.username);
        const history = await storage.loadHistory();

        if (history.length === 0) {
            res.json({
                action: 'Take your first interview',
                reason: 'No baseline established yet'
            });
            return;
        }

        const latest = history[history.length - 1];

        if (latest.score < 50) {
            const weakSkills = latest.weakestSkills.length > 0 ? latest.weakestSkills : ['Basics'];
            const ai = new AIQuestioner({ skills: [], projects: [], experience: [], githubStats: {} }, (process.env.BRAIN_TYPE as BrainType) || 'local');
            const projectSpec = await ai.generateProjectSpec(weakSkills, latest.skillsTested);

            res.json({
                action: 'Fix critical gaps',
                reason: `Score ${latest.score}/100 is below hire threshold`,
                focus: weakSkills[0],
                suggestedProject: projectSpec.title,
                projectSpec // New detailed field
            });
            return;
        }

        if (latest.score < 70) {
            const weakSkills = latest.weakestSkills.length > 0 ? latest.weakestSkills : ['Depth'];
            const ai = new AIQuestioner({ skills: [], projects: [], experience: [], githubStats: {} }, (process.env.BRAIN_TYPE as BrainType) || 'local');
            const projectSpec = await ai.generateProjectSpec(weakSkills, latest.skillsTested);

            res.json({
                action: 'Build depth projects',
                reason: `Score ${latest.score}/100 is passing but weak`,
                focus: weakSkills.slice(0, 2).join(', '),
                suggestedProject: projectSpec.title,
                projectSpec
            });
            return;
        }

        // Strong candidate - Level up
        const ai = new AIQuestioner({ skills: [], projects: [], experience: [], githubStats: {} }, (process.env.BRAIN_TYPE as BrainType) || 'local');
        const projectSpec = await ai.generateProjectSpec(['Advanced System Design', 'Leadership'], latest.skillsTested);

        res.json({
            action: 'Maintain and expand',
            reason: `Score ${latest.score}/100 is strong`,
            focus: 'Add 1-2 new skills with proof projects',
            suggestedProject: projectSpec.title,
            projectSpec
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 FAB Backend running on http://localhost:${PORT}`);
});
