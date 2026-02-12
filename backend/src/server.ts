import { GitHubAnalyzer } from './modules/github/analyzer';
import { ResumeParser } from './modules/resume/parser';
import { ClaimVerifier } from './modules/resume/verifier';
import { ResumeExtractor } from './modules/resume/extractor';

import { UltraDeepAnalyzer } from './modules/assessment/ultra-deep-analyzer';
import { ResumeGapAnalyzer } from './modules/assessment/resume-gap-analyzer';
import { ProjectComparator } from './modules/assessment/project-comparator';
import { CodeQualityAnalyzer } from './modules/assessment/code-quality-analyzer';
import { CareerTrajectoryAnalyzer } from './modules/assessment/career-trajectory-analyzer';
import { upload } from './config/upload';
import axios from 'axios';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Logger } from './modules/logger';
import { InterviewSessionManager } from './modules/interview/session';
import { AIQuestioner } from './modules/interview/ai-questioner';
import { BrainType, LLMFactory } from './modules/llm/factory';
import { HistoryStorage } from './modules/history/storage';
import { ProfileRepository } from './modules/profile/repository';
import { ProjectGenerator } from './modules/coaching/project-generator';
import { runUnifiedAnalysis, getAnalysis } from './modules/analyzer/unified-analyzer';
import { ReportRepository } from './repositories/report-repository';
import { v4 as uuidv4 } from 'uuid';

// --- Environment Configuration ---
const findRootDir = (dir: string): string => {
    if (fs.existsSync(path.join(dir, 'package.json')) &&
        JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')).name === 'fab-root') {
        return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return dir; // Root reached
    return findRootDir(parent);
};

const rootDir = findRootDir(process.cwd());
const envPath = path.resolve(rootDir, '.env');

dotenv.config({ path: envPath });

console.log('----------------------------------------');
Logger.info('🔧 Environment Debug:', {
    cwd: process.cwd(),
    rootDir,
    envPath,
    brainType: process.env.BRAIN_TYPE,
    clientId: process.env.GITHUB_CLIENT_ID
});
console.log('----------------------------------------');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/analyzer/latest-status/:username', async (req, res) => {
    const { username } = req.params;
    const normalizedUsername = (username || '').toLowerCase();
    const reportRepo = new ReportRepository();
    try {
        const latest = await reportRepo.getLatestReportForUser(normalizedUsername);
        Logger.info(`[StatusCheck] Latest report for ${normalizedUsername}:`, {
            found: !!latest,
            id: latest?.id,
            status: latest?.status,
            timestamp: latest?.timestamp
        });
        if (!latest) return res.json({ status: 'missing' });
        return res.json({ id: latest.id, status: latest.status, progress: latest.progress });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- Robust Rate Limiter ---
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 100; // General limit
const MAX_ANALYSIS_REQUESTS = 5; // Stricter limit for heavy processing

const rateLimiter = (limit = MAX_REQUESTS_PER_IP) => (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${String(ip)}:${req.path}`;
    const now = Date.now();
    const state = rateLimitMap.get(key);

    if (state && now < state.resetTime) {
        if (state.count >= limit) {
            Logger.warn(`[RateLimit] Blocked ${key}`, { ip, path: req.path });
            res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((state.resetTime - now) / 1000)
            });
            return;
        }
        state.count++;
    } else {
        rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
    next();
};

// Input Sanitization Helper
const sanitizeInput = (val: any): string => {
    if (typeof val !== 'string') return '';
    return val.replace(/[<>]/g, '').trim().slice(0, 255);
};

// --- Middleware ---

// Correlation ID
app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
});

// Comprehensive Request Logging
app.use((req, res, next) => {
    const start = Date.now();
    const requestId = (req as any).requestId;

    // Log the start of the request immediately
    const isDev = process.env.NODE_ENV !== 'production';
    const logBodyRequested = process.env.LOG_BODY === 'true' || isDev;

    const requestMeta: any = {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };

    if (logBodyRequested && req.body && Object.keys(req.body).length > 0) {
        requestMeta.body = req.body;
    }

    Logger.info(`--> [REQ] ${req.method} ${req.path}`, requestMeta);

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const msg = `<-- [RES] ${req.method} ${req.path} [${status}] (${duration}ms)`;

        const responseMeta = {
            requestId,
            status,
            durationMs: duration
        };

        if (status >= 500) {
            Logger.error(msg, responseMeta);
        } else if (status >= 400) {
            Logger.warn(msg, responseMeta);
        } else {
            Logger.info(msg, responseMeta);
        }
    });

    next();
});

// Validation Helper
const requireFields = (source: any, fields: string[]) => {
    const missing = fields.filter(field => !source[field]);
    if (missing.length > 0) {
        throw { status: 400, message: `Missing required fields: ${missing.join(', ')}` };
    }
};

const validateTypes = (source: any, schema: Record<string, string>) => {
    for (const [key, type] of Object.entries(schema)) {
        if (source[key] && typeof source[key] !== type) {
            throw { status: 400, message: `Invalid type for ${key}: expected ${type}, got ${typeof source[key]}` };
        }
    }
};

const sessionManager = new InterviewSessionManager();
const profileRepo = new ProfileRepository();

// --- Endpoints ---

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'FAB Backend with SQLite',
        brain: process.env.BRAIN_TYPE
    });
});


// Auth
app.get('/auth/github/login', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const redirectUri = `${frontendBaseUrl}/auth/callback`;
    const scope = 'read:user user:email repo';

    const params = new URLSearchParams({
        client_id: clientId || '',
        redirect_uri: redirectUri,
        scope: scope
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

app.post('/auth/github/exchange', async (req, res) => {
    requireFields(req.body, ['code']);
    const { code } = req.body;

    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
    }, { headers: { Accept: 'application/json' } });

    const accessToken = (tokenResponse.data as any).access_token;
    if (!accessToken) throw new Error(`Failed to get access token: ${JSON.stringify(tokenResponse.data)}`);

    const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` }
    });

    const userData = userResponse.data as any;
    const username = userData.login;

    // Sync User
    let profile = await profileRepo.getUser(username);
    if (!profile) {
        await profileRepo.createUser({
            username,
            bio: userData.bio || "GitHub User",
            experienceLevel: 'Mid',
            targetRole: 'Software Engineer',
            lastActive: new Date().toISOString(),
            avatarUrl: userData.avatar_url,
            githubUrl: userData.html_url,
            name: userData.name,
            projects: [],
            skills: {}
        });
        profile = await profileRepo.getUser(username);
    } else {
        await profileRepo.touchUser(username);
    }

    res.json({ username, token: accessToken });
});

// Analysis
// Step 1: List Repos (Fast)
app.post('/github/repos', async (req, res) => {
    requireFields(req.body, ['username']);
    const { username, token } = req.body;

    const analyzer = new GitHubAnalyzer(username, token);
    await analyzer.fetchRepos();

    if (analyzer.lastError) {
        if (analyzer.lastError.includes("User not found")) throw { status: 404, message: "GitHub User not found" };
        if (analyzer.lastError.includes("rate limit")) throw { status: 403, message: "GitHub Rate Limit Exceeded" };
    }

    const simpleRepos = analyzer.getDetailedAnalysis().topProjects;

    res.json({
        username,
        repoCount: analyzer['repos'].length,
        repos: simpleRepos
    });
});

// Step 2: Deep Analyze (Handler Definition)
const deepAnalyzeHandler = async (req: Request, res: Response) => {
    requireFields(req.body, ['username']);
    const { username, token, count = 10 } = req.body;

    const analyzer = new GitHubAnalyzer(username, token);
    await analyzer.fetchRepos();

    const analysis = token
        ? await analyzer.analyzeProjectsDeep(count)
        : await analyzer.analyzeProjectsLight(count);

    if (analysis.length > 0) {
        // [NEW] Store Learned Skills into persistent profile
        let allSkills: Record<string, number> = {};

        // Use Promise.all for parallel DB writes
        await Promise.all(analysis.map(async (project) => {
            // 1. Import Project to DB
            await profileRepo.importProject(username, project);

            // 2. Aggregate Skills
            if (project.learnedSkills) {
                project.learnedSkills.forEach(skill => {
                    allSkills[skill] = (allSkills[skill] || 0) + 1;
                });
            }
        }));

        // Store standard metric
        await profileRepo.updateGrowthHistory(username, 'github_projects_analyzed', analysis.length, { mode: token ? 'DEEP' : 'LIGHT' });

        // Store rich skills
        await profileRepo.mergeSkills(username, allSkills);
    }

    res.json({
        username,
        projectCount: analysis.length,
        analysisMode: token ? 'DEEP' : 'LIGHT',
        projects: analysis
    });
};

app.get('/github/history/:username', async (req, res) => {
    const { username } = req.params;
    const projects = await profileRepo.getGitHubProjects(username);

    res.json({
        username,
        projectCount: projects.length,
        analysisMode: 'DEEP', // Assume deep for history
        projects: projects
    });
});

app.post('/verify-resume-file', upload.single('resume'), async (req, res) => {
    if (!req.file) throw { status: 400, message: 'No file uploaded' };

    // Manual field check for multipart/form-data
    const username = req.body.username;
    const filePath = req.file.path;

    try {
        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(filePath, req.file.mimetype);

        if (!resumeText || !resumeText.trim()) throw { status: 400, message: 'Could not extract text from file.' };

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

            // [MODIFIED] Store the FULL result for hydration/history
            const fullResult = {
                username,
                claimsFound: claims.length,
                verification: verificationResults,
                summary,
                resumeBio: parser.getEnhancedData()?.summary || "",
                projects: parser.getEnhancedData()?.projects || [],
                timestamp: new Date().toISOString()
            };

            await profileRepo.updateGrowthHistory(username, 'resume_verification_full', summary.honestyScore, fullResult);

            // Update Skills (From VerifyResume.tsx Claims)
            const skillsMap: Record<string, number> = {};
            claims.forEach(c => skillsMap[c.skill] = 50);
            await profileRepo.updateSkills(username, skillsMap);

            // [NEW] Merge Learned Skills from Resume Projects
            const enhancedData = parser.getEnhancedData();
            if (enhancedData) {
                await profileRepo.saveResumeData(username, enhancedData);
                Logger.info(`[Resume] Persisted enhanced data for ${username}`);
            }
            if (enhancedData && enhancedData.projects) {
                const learnedSkillsMap: Record<string, number> = {};
                enhancedData.projects.forEach((p: any) => {
                    if (p.learnedSkills && Array.isArray(p.learnedSkills)) {
                        p.learnedSkills.forEach((s: string) => {
                            learnedSkillsMap[s] = (learnedSkillsMap[s] || 0) + 1;
                        });
                    }
                });

                if (Object.keys(learnedSkillsMap).length > 0) {
                    await profileRepo.mergeSkills(username, learnedSkillsMap);
                    Logger.info(`[Resume] Merged ${Object.keys(learnedSkillsMap).length} learned skills from resume projects.`, { username });
                }
            }
        }

        await extractor.cleanup(filePath);
        res.json({
            username,
            claimsFound: claims.length,
            verification: verificationResults,
            summary,
            resumeBio: parser.getEnhancedData()?.summary || "",
            projects: parser.getEnhancedData()?.projects || [], // [NEW] - Pass projects to frontend
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        // Cleanup on error
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw e;
    }
});

// Redundant /analyze/unified now redirects to polling version
app.post('/analyze/unified', rateLimiter(MAX_ANALYSIS_REQUESTS), upload.single('resume'), async (req, res) => {
    requireFields(req.body, ['username', 'githubToken']);
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken; // Don't sanitize token but validate it's a string
    const resumePath = req.file?.path;
    const resumeMimetype = req.file?.mimetype;

    try {
        const analysisId = await runUnifiedAnalysis(username, githubToken, resumePath, resumeMimetype);
        Logger.info('[UnifiedAnalysis] Started analysis', { analysisId, username });
        res.json({ analysisId, status: 'processing' });
    } catch (e: any) {
        if (resumePath && fs.existsSync(resumePath)) fs.unlinkSync(resumePath);
        throw e;
    }
});

// ==================== INTERACTIVE ANALYZER FEATURES ====================

// Feature 1: Ultra-Deep Project Analysis
app.post('/analyze/project-deep', rateLimiter(MAX_ANALYSIS_REQUESTS), async (req, res) => {
    requireFields(req.body, ['username', 'projectName', 'githubToken']);
    const username = sanitizeInput(req.body.username);
    const projectName = sanitizeInput(req.body.projectName);
    const githubToken = req.body.githubToken;

    const brainType = (process.env.BRAIN_TYPE || 'local') as 'local' | 'remote';
    const analyzer = new UltraDeepAnalyzer(brainType);

    try {
        const analysis = await analyzer.analyzeProject(username, projectName, githubToken);
        res.json(analysis);
    } catch (error: any) {
        if (error.status === 404) {
            throw { status: 404, message: error.message };
        }
        throw error;
    }
});

// Feature 2: Resume Gap Analyzer
app.post('/analyze/resume-gaps', rateLimiter(MAX_ANALYSIS_REQUESTS), upload.single('resume'), async (req, res) => {
    requireFields(req.body, ['username', 'githubToken']);
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken;
    const focusRole = sanitizeInput(req.body.focusRole);
    const forceRefresh = req.body.forceRefresh === 'true' || req.body.forceRefresh === true;

    if (!req.file) {
        throw { status: 400, message: 'Resume file is required' };
    }

    const filePath = req.file.path;

    try {
        const extractor = new ResumeExtractor();
        const resumeText = await extractor.extractText(filePath, req.file.mimetype);

        if (!resumeText || !resumeText.trim()) {
            throw { status: 400, message: 'Could not extract text from resume' };
        }

        const brainType = (process.env.BRAIN_TYPE || 'local') as 'local' | 'remote';
        const analyzer = new ResumeGapAnalyzer(brainType);

        const token = getGitHubToken(githubToken);
        const analysis = await analyzer.analyzeGaps(resumeText, username, token, focusRole, forceRefresh);

        await extractor.cleanup(filePath);
        res.json(analysis);
    } catch (e) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw e;
    }
});

// ---------------------------------------------------------
// 3. Project Comparator
// ---------------------------------------------------------
app.post('/analyze/project-compare', upload.none(), async (req, res) => {
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken;
    const compareType = req.body.compareType || 'internal'; // internal | external
    const project1 = sanitizeInput(req.body.project1);
    const project2 = sanitizeInput(req.body.project2);
    const externalUrl = req.body.externalUrl; // for external comparison
    const forceRefresh = req.body.forceRefresh === 'true' || req.body.forceRefresh === true;

    if (!project1) return res.status(400).json({ error: 'Project 1 is required' });

    const comparator = new ProjectComparator((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');

    try {
        let result;
        const token = getGitHubToken(githubToken);
        if (compareType === 'external') {
            if (!externalUrl) return res.status(400).json({ error: 'External URL required' });
            result = await comparator.compareWithExternal(username, project1, externalUrl, token, 'moderate', forceRefresh);
        } else {
            if (!project2) return res.status(400).json({ error: 'Project 2 is required' });
            result = await comparator.compareOwnProjects(username, project1, project2, token, forceRefresh);
        }

        return res.json(result);
    } catch (error: any) {
        Logger.error('Project comparison failed:', error);
        return res.status(500).json({ error: error.message || 'Comparison failed' });
    }
});

// ---------------------------------------------------------
// 4. Ultra-Deep Project Analysis (Single Project)
// ---------------------------------------------------------
app.post('/analyze/project-deep', upload.none(), async (req, res) => {
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken;
    const projectName = sanitizeInput(req.body.projectName);
    const forceRefresh = req.body.forceRefresh === 'true' || req.body.forceRefresh === true;

    if (!projectName) {
        return res.status(400).json({ error: 'Project name is required' });
    }

    const analyzer = new UltraDeepAnalyzer((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');

    try {
        const token = getGitHubToken(githubToken);
        const analysis = await analyzer.analyzeProject(username, projectName, token, forceRefresh);
        return res.json(analysis);
    } catch (error: any) {
        Logger.error('Deep analysis failed:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Analysis failed' });
    }
});

// ---------------------------------------------------------
// 5. Code Quality Deep-Dive
// ---------------------------------------------------------
app.post('/analyze/code-quality', upload.none(), async (req, res) => {
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken;
    const projectName = sanitizeInput(req.body.projectName);
    const forceRefresh = req.body.forceRefresh === 'true' || req.body.forceRefresh === true;

    const analyzer = new CodeQualityAnalyzer((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');

    try {
        const token = getGitHubToken(githubToken);
        const report = await analyzer.analyzeCodeQuality(username, projectName, token, [], forceRefresh);
        res.json(report);
    } catch (error: any) {
        Logger.error('Code quality analysis failed:', error);
        res.status(500).json({ error: error.message || 'Analysis failed' });
    }
});

// ---------------------------------------------------------
// 6. Career Trajectory Analysis
// ---------------------------------------------------------
app.post('/analyze/career-trajectory', upload.none(), async (req, res) => {
    const username = sanitizeInput(req.body.username);
    const githubToken = req.body.githubToken;
    const { timeRange } = req.body;
    const forceRefresh = req.body.forceRefresh === 'true' || req.body.forceRefresh === true;

    const analyzer = new CareerTrajectoryAnalyzer((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');

    try {
        const token = getGitHubToken(githubToken);
        const analysis = await analyzer.analyzeTrajectory(username, token, timeRange || 'all', forceRefresh);
        res.json(analysis);
    } catch (error: any) {
        Logger.error('Career trajectory analysis failed:', error);
        res.status(500).json({ error: error.message || 'Analysis failed' });
    }
});

// ---------------------------------------------------------
// 7. Coaching / Project Suggestions
// ---------------------------------------------------------
app.post('/coaching/suggest', async (req, res) => {
    const { weakSkills, experienceLevel } = req.body;
    // Coaching doesn't have forceRefresh yet as it generates fresh ideas
    const generator = new ProjectGenerator((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');
    try {
        const idea = await generator.generateIdea(weakSkills || [], experienceLevel || 'Intermediate');
        return res.json(idea);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/coaching/accept', async (req, res) => {
    const { username, projectIdea } = req.body;

    if (!projectIdea) {
        return res.status(400).json({ error: "Missing projectIdea in request body" });
    }

    Logger.info('[Coaching] Generating roadmap for:', { title: projectIdea.title, id: projectIdea.id });

    const generator = new ProjectGenerator((process.env.BRAIN_TYPE || 'local') as 'local' | 'remote');
    try {
        const roadmap = await generator.generateRoadmap(projectIdea);

        // Persist project if username is provided
        if (username && username !== 'guest' && roadmap) {
            await profileRepo.addProject(username, {
                title: projectIdea.title,
                description: projectIdea.description,
                status: 'ACCEPTED',
                techStack: projectIdea.techStack,
                roadmap: roadmap
            });
            Logger.info(`[Coaching] Persisted roadmap for ${username}: ${projectIdea.title}`);
        }

        return res.json(roadmap);
    } catch (error: any) {
        Logger.error('[Coaching] Roadmap generation failed', error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/coaching/complete', async (req, res) => {
    const { username, projectId } = req.body;
    if (!username || !projectId) return res.status(400).json({ error: "Missing fields" });

    try {
        await profileRepo.completeProject(username, parseInt(projectId));
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// ====================  INTERVIEW ====================

// Interview

app.post('/interview/start', async (req, res) => {
    try {
        requireFields(req.body, ['username']);
        const { username, context, brainType, enableTraining } = req.body;
        const normalizedUsername = (username || '').toLowerCase();

        Logger.info(`[Interview] Start requested`, { username: normalizedUsername, brainType, requestId: (req as any).requestId });

        // [NEW] Enforce Unified Analysis Prerequisite
        const reportRepo = new ReportRepository();
        const latestReport = await reportRepo.getLatestReportForUser(normalizedUsername);

        if (!latestReport || latestReport.status !== 'complete') {
            Logger.warn(`[Interview] Prerequisite failed for ${normalizedUsername}`, {
                found: !!latestReport,
                status: latestReport?.status
            });
            return res.status(400).json({
                error: "Protocol Violation: Comprehensive Profile Analysis required before starting interrogation.",
                code: "PREREQUISITE_FAILED"
            });
        }

        // [NEW] Enrich context from Unified Analysis Report
        const candidateIntelligence = await profileRepo.getCandidateIntelligence(username);
        const growthHistory = await profileRepo.getGrowthHistory(username);

        const finalContext = {
            skills: latestReport.github.techStack || [],
            projects: latestReport.github.projects.map(p => ({
                name: p.name,
                description: p.description,
                techStack: p.techStack,
                architecture: p.architecture || 'Standard',
                complexity: p.complexity || 'Medium',
                coreFiles: []
            })),
            experience: latestReport.resume.claims || [],
            githubStats: {
                stars: latestReport.github.totalStars,
                forks: latestReport.github.totalForks,
                repos: latestReport.github.totalRepos
            },
            summary: latestReport.resume.summary || '',
            resumeData: {
                experience: latestReport.resume.claims,
                projects: latestReport.resume.projects,
                skills: latestReport.resume.skills
            },
            growthHistory: growthHistory,
            candidateIntelligence: candidateIntelligence,
            verification: latestReport.verification
        };

        const session = await sessionManager.createSession(
            username,
            finalContext,
            (brainType as BrainType) || (process.env.BRAIN_TYPE as BrainType) || 'local'
        );
        let question = await sessionManager.getNextQuestion(session.id);

        if (!question) {
            return res.status(500).json({ error: "Failed to generate initial question from AI." });
        }

        return res.json({
            sessionId: session.id,
            firstQuestion: question.text
        });
    } catch (e: any) {
        console.error(`[Interview] Start failed:`, e);
        return res.status(500).json({ error: e.message || "Internal server error" });
    }
});

app.get('/interview/status/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);

    if (!session) {
        return res.status(404).json({ error: "Session not found or expired." });
    }

    return res.json({
        id: session.id,
        status: session.status,
        currentQuestion: session.currentQuestion,
        questionCount: session.questionHistory.length,
        transcriptLength: session.questionHistory.length,
        satisfaction: Math.round(session.satisfactionScore),
        done: session.status === 'completed' || session.status === 'expired',
        lastFeedback: session.questionHistory.length > 0 ? session.questionHistory[session.questionHistory.length - 1].feedback : null
    });
});

app.post('/interview/answer', async (req, res) => {
    try {
        requireFields(req.body, ['sessionId', 'answer']);
        const { sessionId, answer } = req.body;

        const session = sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: "Session not found. It may have expired." });
        }

        const result = await sessionManager.submitAnswer(sessionId, answer);

        // Handle retry question if recovery happened
        if (result.retryQuestion) {
            return res.json({
                feedback: result.feedback,
                score: result.score,
                satisfaction: result.satisfaction,
                nextQuestion: result.retryQuestion,
                done: false
            });
        }

        const nextQuestion = await sessionManager.getNextQuestion(sessionId);
        const done = session.status === 'completed' || !nextQuestion;

        if (done && session.username) {
            await sessionManager.completeSession(sessionId);
            const sessionSummary = await sessionManager.getSessionSummary(sessionId);
            if (sessionSummary) {
                await profileRepo.updateGrowthHistory(
                    session.username,
                    'interview_score',
                    sessionSummary.score,
                    {
                        sessionId,
                        type: 'Technical',
                        name: "Technical Interrogation",
                        description: `Comprehensive skills assessment for ${session.context.skills.join(', ') || 'General Engineering'}.`
                    }
                );
            }
        }

        return res.json({
            feedback: result.feedback,
            score: result.score,
            satisfaction: result.satisfaction,
            nextQuestion,
            done
        });
    } catch (e: any) {
        console.error(`[Interview] Answer failed:`, e);
        if (e.message.includes('Session not found')) {
            return res.status(404).json({ error: "Session not found." });
        }
        return res.status(500).json({ error: e.message || "Internal server error" });
    }
});

app.post('/interview/stop', async (req, res) => {
    try {
        requireFields(req.body, ['sessionId']);
        const { sessionId } = req.body;

        const session = sessionManager.getSession(sessionId);
        if (!session) return res.status(404).json({ error: "Session not found." });

        const record = await sessionManager.completeSession(sessionId);
        return res.json({ success: true, record });
    } catch (e: any) {
        console.error(`[Interview] Stop failed:`, e);
        return res.status(500).json({ error: e.message || "Internal server error" });
    }
});

app.get('/interview/summary/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { username } = req.query;

    const summary = await sessionManager.getSessionSummary(sessionId, username as string);
    if (!summary) throw { status: 404, message: 'Session not found' };
    res.json(summary);
});

app.get('/interview/status/:sessionId', (req, res) => {
    const session = sessionManager.getSession(req.params.sessionId);
    if (!session) throw { status: 404, message: 'Session not found' };

    // Get last feedback if available
    const lastEntry = session.questionHistory.length > 0 ? session.questionHistory[session.questionHistory.length - 1] : null;

    res.json({
        id: session.id, // Frontend expects 'id', endpoints.ts interface says 'id'
        currentQuestion: session.currentQuestion,
        status: session.status,
        satisfaction: session.satisfactionScore,
        done: session.status === 'completed' || session.status === 'expired',
        transcriptLength: session.questionHistory.length,
        lastFeedback: lastEntry ? lastEntry.feedback : null
    });
});


// Progress
app.get('/progress/:username', async (req, res) => {
    const { username } = req.params;
    const history = await profileRepo.getGrowthHistory(username);
    const user = await profileRepo.getUser(username);

    const stats = {
        totalXP: history.length * 100,
        level: user?.experienceLevel || 'Junior',
        completedChallenges: history.filter(h => h.metric === 'project_completed').length,
        interviewScore: history.filter(h => h.metric === 'interview_score').reduce((acc, curr) => acc + curr.value, 0) / (history.filter(h => h.metric === 'interview_score').length || 1)
    };

    res.json({ username, history, stats });
});

app.get('/progress/:username/projects', async (req, res) => {
    const projects = await profileRepo.getProjects(req.params.username);
    res.json(projects);
});

app.get('/progress/:username/next-action', async (req, res) => {
    const action = await profileRepo.getNextAction(req.params.username);
    res.json(action);
});

// Profile
app.get('/profile/:username', async (req, res) => {
    const { username } = req.params;
    const user = await profileRepo.getUser(username);

    if (!user) {
        res.json({
            username: username,
            bio: '',
            experienceLevel: 'Junior',
            targetRole: 'Software Engineer',
            skills: {},
            growthHistory: [],
            projects: []
        });
        return;
    }

    // Enrich with history and projects
    // Enrich with history and projects
    const growthHistory = await profileRepo.getGrowthHistory(username);

    // [FIX] If Unified Analysis has already populated projects (rich data), use them.
    // Otherwise, fetch from legacy tables.
    let finalProjects = user.projects || [];

    if (finalProjects.length === 0) {
        const githubProjects = await profileRepo.getGitHubProjects(username);
        const manualProjects = await profileRepo.getProjects(username);
        finalProjects = [...githubProjects, ...manualProjects];
    } else {
        // We might still want to merge manual assessments if they aren't in the analysis
        const manualProjects = await profileRepo.getProjects(username);
        // Avoid duplicates by name
        const manualUnique = manualProjects.filter(mp => !finalProjects.some((fp: any) => fp.name === mp.name));
        finalProjects = [...finalProjects, ...manualUnique];
    }

    res.json({
        ...user,
        growthHistory,
        projects: finalProjects
    });
});

// ═══════════════════ Growth Dashboard ═══════════════════

app.get('/growth/:username/interviews', async (req, res) => {
    const history = await profileRepo.getInterviewHistory(req.params.username);
    res.json(history);
});

app.get('/growth/:username/challenges', async (req, res) => {
    const challenges = await profileRepo.getActiveChallenges(req.params.username);
    res.json(challenges);
});

app.post('/profile', async (req, res) => {
    requireFields(req.body, ['username']);
    const { username, ...updates } = req.body;

    validateTypes(req.body, { username: 'string', bio: 'string', experienceLevel: 'string' });

    let profile = await profileRepo.getUser(username);
    if (!profile) {
        await profileRepo.createUser({ username, ...updates });
    } else {
        await profileRepo.updateUser(username, updates);
    }

    profile = await profileRepo.getUser(username);
    return res.json(profile);
});

// Coaching
app.get('/coaching/suggest/:username', async (req, res) => {
    const { username } = req.params;
    const profile = await profileRepo.getUser(username);
    if (!profile) throw { status: 404, message: 'User not found' };

    const weakSkills = Object.entries(profile.skills)
        .filter(([_, level]) => level < 70)
        .map(([skill]) => skill);

    if (weakSkills.length === 0) {
        res.json({ message: "No weak skills found. You are too powerful." });
        return;
    }

    const generator = new ProjectGenerator(process.env.BRAIN_TYPE as BrainType || 'local');
    const projectIdea = await generator.generateIdea(weakSkills.slice(0, 3), profile.experienceLevel);
    res.json(projectIdea);
});

app.post('/coaching/accept', rateLimiter(), async (req, res) => {
    requireFields(req.body, ['username', 'projectIdea']);
    const { username, projectIdea } = req.body;

    // 1. Generate Roadmap
    const generator = new ProjectGenerator(process.env.BRAIN_TYPE as BrainType || 'local');
    const roadmap = await generator.generateRoadmap(projectIdea);

    // 2. Save Project to Profile (STATUS = STARTED)
    await profileRepo.addProject(username, {
        name: projectIdea.title,
        description: projectIdea.description,
        status: 'STARTED',
        techStack: projectIdea.techStack,
        startedAt: new Date().toISOString(),
        roadmap: roadmap
    });

    res.json(roadmap);
});

// ═══════════════════ Unified Analyzer ═══════════════════

app.post('/analyzer/deep-search', rateLimiter(MAX_ANALYSIS_REQUESTS), upload.single('resume'), async (req, res) => {
    const { username, token } = req.body;
    if (!username || !token) {
        return res.status(400).json({ error: 'username and token are required' });
    }

    const resumePath = req.file?.path;
    const resumeMimetype = req.file?.mimetype;

    try {
        const analysisId = await runUnifiedAnalysis(username, token, resumePath, resumeMimetype);
        Logger.info('[Analyzer] Deep search started', { analysisId, username, hasResume: !!resumePath });
        return res.json({ analysisId, status: 'processing' });
    } catch (e: any) {
        if (resumePath && fs.existsSync(resumePath)) fs.unlinkSync(resumePath);
        throw e;
    }
});

app.get('/analyzer/status/:id', async (req, res) => {
    const report = await getAnalysis(req.params.id);
    if (!report) return res.status(404).json({ error: 'Analysis not found' });
    return res.json({ id: report.id, status: report.status, progress: report.progress });
});

app.get('/analyzer/report/:id', async (req, res) => {
    const report = await getAnalysis(req.params.id);
    if (!report) return res.status(404).json({ error: 'Analysis not found' });
    if (report.status !== 'complete' && report.status !== 'error') {
        return res.json({ id: report.id, status: report.status, progress: report.progress });
    }
    return res.json(report);
});

// ==================== CONFIG ENDPOINTS ====================
// Helper to get GitHub Token with fallback to environment
const getGitHubToken = (reqToken?: string): string => {
    const token = reqToken || process.env.GITHUB_TOKEN || '';
    if (!token) {
        Logger.warn('[Server] No GitHub token found in request or environment');
    }
    return token;
};

// GitHub Token Persistence
app.post('/config/github-token', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }

        const lines = envContent.split('\n');
        const newLines = lines.filter(line => !line.startsWith('GITHUB_TOKEN='));
        newLines.push(`GITHUB_TOKEN=${token}`);

        fs.writeFileSync(envPath, newLines.join('\n').trim() + '\n');
        process.env.GITHUB_TOKEN = token; // Update current process

        Logger.info('[Config] GitHub token updated and persisted to .env');
        return res.json({ message: 'GitHub token saved successfully' });
    } catch (error: any) {
        Logger.error('[Config] Failed to save GitHub token', error);
        return res.status(500).json({ error: 'Failed to save token' });
    }
});

// Brain Configuration (Local vs Remote)
app.get('/config/brain', async (req, res) => {
    const brainType = (process.env.BRAIN_TYPE || 'local') as 'local' | 'remote';
    const remoteUrl = process.env.REMOTE_BRAIN_URL || '';

    res.json({
        brainType,
        status: brainType === 'remote' && !remoteUrl ? 'missing_url' : 'configured',
        remoteUrl: brainType === 'remote' ? remoteUrl : undefined
    });
});

app.post('/config/brain', async (req, res) => {
    const { brainType, remoteUrl } = req.body;
    const cleanRemoteUrl = (remoteUrl || '').trim();

    if (!brainType || !['local', 'remote'].includes(brainType)) {
        return res.status(400).json({ error: 'Invalid brainType. Must be "local" or "remote"' });
    }

    // Relaxed validation: Allow switching to remote without URL initially
    // if (brainType === 'remote' && !remoteUrl) {
    //     return res.status(400).json({ error: 'remoteUrl is required when brainType is "remote"' });
    // }

    // Update environment variables
    process.env.BRAIN_TYPE = brainType;
    if (brainType === 'remote') {
        process.env.REMOTE_BRAIN_URL = remoteUrl;
    } else {
        delete process.env.REMOTE_BRAIN_URL;
    }

    // Persist to .env file
    try {
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const envLines = envContent.split('\n');
        const newLines = [];
        const found = { brainType: false, remoteUrl: false };

        for (const line of envLines) {
            if (line.startsWith('BRAIN_TYPE=')) {
                newLines.push(`BRAIN_TYPE=${brainType}`);
                found.brainType = true;
            } else if (line.startsWith('REMOTE_BRAIN_URL=')) {
                if (brainType === 'remote') {
                    newLines.push(`REMOTE_BRAIN_URL=${remoteUrl}`);
                    found.remoteUrl = true;
                }
                // If local, remove REMOTE_BRAIN_URL line or leave it? Better to update it or comment it out.
                // We'll just update it if we are switching to remote. If switching to local, we can leave it or clear it.
                // Let's keep it but maybe it doesn't matter if BRAIN_TYPE is local.
            } else {
                newLines.push(line);
            }
        }

        if (!found.brainType) newLines.push(`BRAIN_TYPE=${brainType}`);
        if (!found.remoteUrl && brainType === 'remote') newLines.push(`REMOTE_BRAIN_URL=${cleanRemoteUrl}`);

        fs.writeFileSync(envPath, newLines.join('\n'));
        Logger.info('💾 Configuration saved to .env');
    } catch (e) {
        Logger.error('❌ Failed to save .env:', e);
    }

    Logger.info(`🧠 Brain configuration updated: ${brainType}${brainType === 'remote' ? ` -> ${cleanRemoteUrl}` : ''}`);

    return res.json({
        brainType,
        status: 'configured',
        remoteUrl: brainType === 'remote' ? cleanRemoteUrl : undefined
    });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log distinctively based on status
    if (status >= 500) {
        Logger.error(`[CRITICAL] ${req.method} ${req.url}:`, err);
    } else {
        Logger.warn(`[CLIENT] ${req.method} ${req.url}: ${message}`);
    }

    res.status(status).json({
        error: message,
        timestamp: new Date().toISOString()
    });
});


app.listen(PORT, () => {
    Logger.info(`🚀 FAB Backend running on http://localhost:${PORT}`);
    Logger.info(`🧠 Brain Type: ${process.env.BRAIN_TYPE}`);
});
