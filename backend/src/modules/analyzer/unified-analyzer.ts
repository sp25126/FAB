/**
 * Unified Analyzer – Production-Grade Pipeline
 *
 * 5-phase progressive analysis:
 *   Phase 1: Fetch GitHub repos + sort by priority          (0→15%)
 *   Phase 2: Light-scan ALL repos in parallel batches       (15→35%)
 *   Phase 3: Deep-analyze top projects, save after each     (35→70%)
 *   Phase 4: Resume parse + AI skill verification           (70→85%)
 *   Phase 5: 7-dimension scoring + insights                 (85→100%)
 */

import { GitHubAnalyzer } from '../github/analyzer';
import { ResumeParser } from '../resume/parser';
import { ClaimVerifier } from '../resume/verifier';
import { ResumeExtractor } from '../resume/extractor';
import { BrainAnalyzer } from '../assessment/brain-analyzer';
import { computeScoreCard, ScoringInput } from './scoring';
import { Logger } from '../logger';
import * as fs from 'fs';
import {
    UnifiedAnalysisReport,
    AnalysisProject,
    SkillDetail,
} from './types';

import { ReportRepository } from '../../repositories/report-repository';

// ────────────────────────── constants ──────────────────────────

const reportRepo = new ReportRepository();
const PIPELINE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes max
const PHASE_TIMEOUT_MS = 600_000;              // 10 minutes per phase (increased for slow brains)
const DEEP_CONCURRENCY = 3;
const LIGHT_CONCURRENCY = 5;

// ────────────────────────── public API ──────────────────────────

export async function getAnalysis(id: string): Promise<UnifiedAnalysisReport | null> {
    return reportRepo.getReport(id);
}

export async function runUnifiedAnalysis(
    username: string,
    token: string,
    resumePath?: string,
    resumeMimetype?: string,
): Promise<string> {

    const id = `ua_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const report: UnifiedAnalysisReport = {
        id,
        username,
        timestamp: new Date().toISOString(),
        status: 'processing',
        progress: { phase: 'Starting analysis…', percent: 0 },
        scores: { honesty: 0, depth: 0, breadth: 0, experience: 0, readiness: 0 },
        scorecard: undefined,
        skillDetails: [],
        resume: { claims: [], projects: [], summary: '', skills: [] },
        github: { projects: [], totalRepos: 0, techStack: [], totalStars: 0, totalForks: 0 },
        verification: { verified: [], overclaimed: [], weak: [] },
        insights: { strengths: [], gaps: [], recommendations: [] },
        metadata: { githubUsername: username, analysisMode: token ? 'DEEP' : 'LIGHT', processingTime: 0 },
        errors: [],
    };

    await reportRepo.saveReport(report);
    Logger.info('[Analyzer] Initialized', { id, username });

    const startTime = Date.now();

    // Run pipeline with global timeout
    const pipeline = runPipeline(report, username, token, resumePath, resumeMimetype);
    const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`Pipeline timeout: exceeded ${PIPELINE_TIMEOUT_MS / 60000} minutes`)), PIPELINE_TIMEOUT_MS)
    );

    Promise.race([pipeline, timeout]).then(async () => {
        report.metadata.processingTime = Date.now() - startTime;
        await reportRepo.saveReport(report);
        Logger.info('[Analyzer] ✅ Complete', { id, duration: report.metadata.processingTime });
    }).catch(async err => {
        report.status = 'error';
        report.errors.push(err.message || String(err));
        report.progress = { phase: 'Analysis failed', percent: 0 };
        report.metadata.processingTime = Date.now() - startTime;
        await reportRepo.saveReport(report);
        Logger.error('[Analyzer] ❌ Failed', { id, error: err.message });
    });

    return id;
}

// ────────────────────────── helpers ──────────────────────────

async function withPhaseTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${PHASE_TIMEOUT_MS / 1000}s`)), PHASE_TIMEOUT_MS)
    );
    return Promise.race([promise, timeout]);
}

function computePriority(repo: any): number {
    const stars = repo.stargazers_count || repo.stars || 0;
    const forks = repo.forks_count || repo.forks || 0;
    const daysAgo = repo.pushed_at
        ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : 365;
    const recencyBonus = daysAgo <= 30 ? 15 : daysAgo <= 90 ? 8 : daysAgo <= 180 ? 3 : 0;
    return stars * 2 + forks + recencyBonus;
}

async function saveProgress(report: UnifiedAnalysisReport, phase: string, percent: number, detail?: string) {
    report.progress = { phase, percent, detail };
    await reportRepo.saveReport(report);
}

// ────────────────────────── pipeline ──────────────────────────

async function runPipeline(
    report: UnifiedAnalysisReport,
    username: string,
    token: string,
    resumePath?: string,
    resumeMimetype?: string,
): Promise<void> {

    const errors: string[] = [];
    const brainType = (process.env.BRAIN_TYPE || 'local') as 'local' | 'remote';
    const brain = new BrainAnalyzer(brainType);

    // ── Phase 1: Fetch GitHub repos ──────────────────────────
    Logger.info('[Analyzer] Phase 1 – Fetching repos', { id: report.id });
    await saveProgress(report, 'Fetching GitHub repositories…', 5);

    const githubAnalyzer = new GitHubAnalyzer(username, token);
    let allRepos: any[] = [];

    try {
        await withPhaseTimeout(githubAnalyzer.fetchRepos(), 'Phase 1: fetchRepos');
        allRepos = githubAnalyzer.repos || [];
        Logger.info('[Analyzer] Phase 1 – fetched repos', { id: report.id, count: allRepos.length });
    } catch (e: any) {
        errors.push(`GitHub fetch failed: ${e.message}`);
        Logger.error('[Analyzer] Phase 1 failed', { id: report.id, error: e.message });
    }

    // Sort repos by priority (stars*2 + forks + recency bonus)
    allRepos.sort((a: any, b: any) => computePriority(b) - computePriority(a));

    report.github.totalRepos = allRepos.length;
    report.github.totalStars = allRepos.reduce((s: number, r: any) => s + (r.stargazers_count || 0), 0);
    report.github.totalForks = allRepos.reduce((s: number, r: any) => s + (r.forks_count || 0), 0);
    await saveProgress(report, 'Repos fetched, starting light scan…', 15);

    // ── Phase 2: Light scan ALL repos in parallel ──────────────────────────
    Logger.info('[Analyzer] Phase 2 – Light scanning all repos', { id: report.id, count: allRepos.length });

    const lightProjects: AnalysisProject[] = [];

    for (let i = 0; i < allRepos.length; i += LIGHT_CONCURRENCY) {
        Logger.info(`[Analyzer] Phase 2 – Light scanning batch ${Math.floor(i / LIGHT_CONCURRENCY) + 1} of ${Math.ceil(allRepos.length / LIGHT_CONCURRENCY)}`, { id: report.id });
        const batch = allRepos.slice(i, i + LIGHT_CONCURRENCY);
        const pct = 15 + Math.round((i / Math.max(allRepos.length, 1)) * 20);
        await saveProgress(report, 'Light scanning repositories…', pct, `Batch ${Math.floor(i / LIGHT_CONCURRENCY) + 1}`);

        Logger.info(`[Analyzer] Scanning repos: ${batch.map(r => r.name).join(', ')}`);
        const results = await Promise.allSettled(
            batch.map((repo: any) => lightScanRepo(repo))
        );

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                lightProjects.push(r.value);
            }
        }
    }

    // Save light-scanned projects immediately (user sees them now)
    report.github.projects = lightProjects;
    report.github.techStack = [...new Set(lightProjects.flatMap(p => p.techStack))];
    await saveProgress(report, 'Light scan complete, starting deep analysis…', 35);
    Logger.info('[Analyzer] Phase 2 complete', { id: report.id, lightCount: lightProjects.length });

    // Lifted variables for shared scope
    const deepCount = Math.min(10, allRepos.length);
    const deepProjects: AnalysisProject[] = [];

    // ── Phase 3: Resume parsing + skill verification (Swapped) ──────────────────────────
    Logger.info('[Analyzer] Phase 3 – Resume & verification', { id: report.id });
    await saveProgress(report, 'Analyzing resume…', 40);

    let resumeSkills: string[] = [];
    let resumeText = '';

    if (resumePath && fs.existsSync(resumePath)) {
        try {
            const extractor = new ResumeExtractor();
            resumeText = await withPhaseTimeout(
                extractor.extractText(resumePath, resumeMimetype || 'text/plain'),
                'Resume extraction'
            );

            const parser = new ResumeParser(resumeText);
            const claims = await withPhaseTimeout(parser.extractClaims(), 'Resume claim extraction');
            const enhanced = parser.getEnhancedData();
            resumeSkills = claims.map(c => c.skill);

            report.resume.skills = resumeSkills;
            report.resume.summary = enhanced?.summary || '';
            report.resume.claims = claims.map(c => ({
                skill: c.skill,
                category: c.category,
                evidenceStrength: c.evidenceStrength || 'PENDING'
            }));

            report.metadata.resumeFileName = resumePath.split(/[\\/]/).pop();
            Logger.info('[Analyzer] Resume parsed', { id: report.id, skills: resumeSkills.length });
        } catch (e: any) {
            errors.push(`Resume parsing failed: ${e.message}`);
            Logger.error('[Analyzer] Resume parse failed', { id: report.id, error: e.message });
        }
    }

    // Skill verification against GitHub data
    await saveProgress(report, 'Verifying skills…', 50);
    const allGithubSkills = new Set(report.github.techStack.map(s => s.toLowerCase()));

    if (resumeSkills.length > 0) {
        try {
            Logger.info(`[Analyzer] Verifying ${resumeSkills.length} skills against GitHub footprint...`);
            const verifier = new ClaimVerifier(githubAnalyzer);
            const verificationResults = verifier.verifyAllClaims(resumeSkills);

            for (const v of verificationResults) {
                Logger.info(`[Analyzer] Skill "${v.skill}" -> ${v.verdict} (${v.evidenceStrength})`);
                const mapped = {
                    skill: v.skill,
                    category: v.claimed ? 'language' : 'concept',
                    verdict: v.verdict,
                    confidence: v.evidenceStrength === 'STRONG' ? 0.9 : v.evidenceStrength === 'MODERATE' ? 0.6 : 0.3,
                    reasoning: v.githubEvidence || v.recommendation || '',
                    recommendation: v.recommendation,
                    projectIdea: v.projectIdea,
                    learningPath: v.learningPath,
                };
                if (v.verdict === 'VERIFIED') report.verification.verified.push(mapped);
                else if (v.verdict === 'WEAK_SUPPORT') report.verification.weak.push(mapped);
                else report.verification.overclaimed.push(mapped);

                // Update claim evidence strength
                const claim = report.resume.claims.find(c => c.skill === v.skill);
                if (claim) claim.evidenceStrength = v.evidenceStrength || 'WEAK';
            }
        } catch (e: any) {
            errors.push(`Skill verification failed: ${e.message}`);
            Logger.error('[Analyzer] Verification failed', { id: report.id, error: e.message });
        }
    }

    // ── Build skill details with evidence mapping ──
    report.skillDetails = buildSkillDetails(report);
    await saveProgress(report, 'Skills verified', 55);

    // ── Phase 4: Preliminary Scoring (Fast) ──────────────────────────
    Logger.info('[Analyzer] Phase 4 – Preliminary Scoring', { id: report.id });
    await saveProgress(report, 'Computing preliminary scores…', 60);

    try {
        const prelimInput: ScoringInput = {
            repoCount: report.github.totalRepos,
            originalRepoCount: allRepos.filter((r: any) => !r.fork).length,
            totalStars: report.github.totalStars,
            totalForks: report.github.totalForks,
            totalCommits: 0,
            languages: report.github.techStack,
            deepProjects: [],
            verificationResults: [
                ...report.verification.verified,
                ...report.verification.weak,
                ...report.verification.overclaimed,
            ].map(v => ({ skill: v.skill, verdict: v.verdict, evidenceStrength: v.confidence > 0.7 ? 'STRONG' : 'WEAK' })),
            totalClaims: resumeSkills.length,
            verifiedClaims: report.verification.verified.length,
            overclaimed: report.verification.overclaimed.length,
            recentActivityDays: githubAnalyzer.getRecentActivityDays(),
            languageDiversity: new Set(report.github.techStack).size,
            contributorProjects: 0,
        };
        report.scorecard = computeScoreCard(prelimInput);
        const getDim = (name: string) => report.scorecard!.dimensions.find(d => d.name === name)?.score || 0;
        report.scores = {
            honesty: getDim('Resume Honesty'),
            depth: getDim('Technical Depth'),
            breadth: getDim('Skill Breadth'),
            experience: getDim('Portfolio Impact'),
            readiness: getDim('Growth & Activity'),
        };
        await reportRepo.saveReport(report);
    } catch (e: any) {
        Logger.warn('[Analyzer] Preliminary scoring failed', { error: e.message });
    }

    // ── Phase 5: Deep-analyze top projects (Swapped) ──────────────────────────
    // Note: deepAmount & deepProjects declared at start of pipeline
    Logger.info('[Analyzer] Phase 5 – Deep analyzing top projects', { id: report.id, deepCount });

    const topRepos = allRepos.slice(0, deepCount);

    for (let i = 0; i < topRepos.length; i += DEEP_CONCURRENCY) {
        const batch = topRepos.slice(i, i + DEEP_CONCURRENCY);
        const pct = 60 + Math.round((i / Math.max(deepCount, 1)) * 30);
        await saveProgress(report, 'Deep analyzing projects…', pct, `Project ${i + 1}/${deepCount}`);

        Logger.info(`[Analyzer] Phase 5 – Deep analysis loop: ${batch.map(r => r.name).join(', ')}`);
        const results = await Promise.allSettled(
            batch.map((repo: any) =>
                withPhaseTimeout(
                    deepAnalyzeRepo(githubAnalyzer, brain, repo, token),
                    `Deep analysis: ${repo.name}`
                ).then(res => {
                    Logger.info(`[Analyzer] ✅ Deep analysis complete for: ${repo.name}`);
                    return res;
                }).catch(e => {
                    Logger.warn('[Analyzer] Deep analysis failed for repo', { repo: repo.name, error: e.message });
                    return null;
                })
            )
        );

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
                deepProjects.push(r.value);

                // Replace the light-scanned version with deep version
                const idx = report.github.projects.findIndex(p => p.name === (r.value as AnalysisProject).name);
                if (idx >= 0) {
                    report.github.projects[idx] = r.value as AnalysisProject;
                } else {
                    report.github.projects.push(r.value as AnalysisProject);
                }
            }
        }

        // Save after each batch so frontend sees progressive updates
        await reportRepo.saveReport(report);
    }

    report.github.techStack = [...new Set(report.github.projects.flatMap(p => p.techStack))];
    await saveProgress(report, 'Deep analysis complete', 90);
    Logger.info('[Analyzer] Phase 5 complete', { id: report.id, deepCount: deepProjects.length });


    // ── Phase 6: Final Scoring + Insights ──────────────────────────
    Logger.info('[Analyzer] Phase 6 – Final Scoring', { id: report.id });
    await saveProgress(report, 'Computing scores…', 88);

    try {
        const scoringInput: ScoringInput = {
            repoCount: report.github.totalRepos,
            originalRepoCount: allRepos.filter((r: any) => !r.fork).length,
            totalStars: report.github.totalStars,
            totalForks: report.github.totalForks,
            totalCommits: deepProjects.reduce((s, p) => s + (p.commitCount || 0), 0),
            languages: report.github.techStack,
            deepProjects: deepProjects.map(p => ({
                name: p.name,
                complexity: p.complexity || 'BASIC',
                testCoverage: p.testCoverage || false,
                architecture: p.architecture || 'Unknown',
                techStack: p.techStack || [],
                commitCount: p.commitCount || 0,
                readmeContent: '',
                stars: p.stars || 0,
                forks: p.forks || 0,
                hasCI: false,
                hasLinting: false,
                dependencyCount: p.techStack?.length || 0,
            })),
            verificationResults: [
                ...report.verification.verified,
                ...report.verification.weak,
                ...report.verification.overclaimed,
            ].map(v => ({ skill: v.skill, verdict: v.verdict, evidenceStrength: v.confidence > 0.7 ? 'STRONG' : 'WEAK' })),
            totalClaims: resumeSkills.length,
            verifiedClaims: report.verification.verified.length,
            overclaimed: report.verification.overclaimed.length,
            recentActivityDays: githubAnalyzer.getRecentActivityDays(),
            languageDiversity: new Set(report.github.techStack).size,
            contributorProjects: 0,
        };

        const scorecard = computeScoreCard(scoringInput);
        report.scorecard = scorecard;

        // Map to legacy scores for backward compat
        const getDim = (name: string) => scorecard.dimensions.find(d => d.name === name)?.score || 0;
        report.scores = {
            honesty: getDim('Resume Honesty'),
            depth: getDim('Technical Depth'),
            breadth: getDim('Skill Breadth'),
            experience: getDim('Portfolio Impact'),
            readiness: getDim('Growth & Activity'),
        };

        // Generate insights
        report.insights.strengths = scorecard.strengths.map(s => ({
            type: 'strength' as const, title: s,
            description: `Your ${s} score is strong — keep building on this.`,
            priority: 'high' as const
        }));
        report.insights.gaps = scorecard.weaknesses.map(w => ({
            type: 'gap' as const, title: w,
            description: `Your ${w} score needs improvement. ${scorecard.dimensions.find(d => d.name === w)?.tips?.[0] || ''}`,
            priority: 'high' as const
        }));

        // Generate recommendations from dimension tips
        const allTips = scorecard.dimensions.flatMap(d => d.tips.map(t => ({ dim: d.name, tip: t })));
        report.insights.recommendations = allTips.slice(0, 5).map(({ dim, tip }) => ({
            title: `Improve ${dim}`,
            description: tip,
            techStack: [],
            difficulty: 'Intermediate' as const,
        }));

    } catch (e: any) {
        errors.push(`Scoring failed: ${e.message}`);
        Logger.error('[Analyzer] Scoring failed', { id: report.id, error: e.message });
    }

    // ── Finalize ──
    report.errors = errors;
    report.status = errors.length > 3 ? 'error' : 'complete';
    await saveProgress(report, report.status === 'complete' ? 'Analysis complete' : 'Completed with errors', 100);
    Logger.info('[Analyzer] Pipeline finished', { id: report.id, status: report.status, errors: errors.length });
}

// ────────────────────────── light scan ──────────────────────────

function lightScanRepo(repo: any): AnalysisProject {
    const lang = repo.language || '';
    return {
        name: repo.name || repo.full_name,
        source: 'github',
        description: repo.description || '',
        techStack: [lang].filter(Boolean),
        complexity: 'BASIC',
        architecture: 'Unknown',
        analysisDepth: 'light',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        commitCount: 0,
        testCoverage: false,
        url: repo.html_url || '',
        language: lang,
        priorityScore: computePriority(repo),
        lastUpdated: repo.pushed_at,
    };
}

// ────────────────────────── deep analysis ──────────────────────────

async function deepAnalyzeRepo(
    ghAnalyzer: GitHubAnalyzer,
    brain: BrainAnalyzer,
    repo: any,
    token: string
): Promise<AnalysisProject> {
    const repoName = repo.name;
    const owner = repo.owner?.login || repo.full_name?.split('/')[0] || '';

    // Fetch all metadata in parallel
    const [readme, languages, commits, fileTree] = await Promise.allSettled([
        ghAnalyzer.fetchReadme(repoName).catch(() => ''),
        ghAnalyzer.fetchLanguages(repoName).catch(() => ({})),
        ghAnalyzer.fetchCommitCount(repoName).catch(() => 0),
        ghAnalyzer.fetchFileStructure(repoName).catch(() => []),
    ]);

    const readmeText = readme.status === 'fulfilled' ? readme.value : '';
    const langs = languages.status === 'fulfilled' ? languages.value : {};
    const commitCount = commits.status === 'fulfilled' ? commits.value : 0;
    const tree = fileTree.status === 'fulfilled' ? fileTree.value : [];

    // Derive tech stack from languages
    const techStack = Object.keys(langs);
    if (repo.language && !techStack.includes(repo.language)) {
        techStack.unshift(repo.language);
    }

    // Check for test files
    const hasTests = tree.some((f: any) =>
        /\.(test|spec)\.(ts|js|py|java)$/.test(f.path || '') ||
        /^tests?\//.test(f.path || '') ||
        /^__tests__\//.test(f.path || '')
    );

    // Check for CI/CD
    const hasCI = tree.some((f: any) =>
        /\.github\/workflows/.test(f.path || '') ||
        /\.gitlab-ci\.yml/.test(f.path || '') ||
        /Jenkinsfile/.test(f.path || '')
    );

    // Assess complexity
    const complexity = commitCount > 50 && techStack.length > 2 ? 'ADVANCED'
        : commitCount > 15 || techStack.length > 1 ? 'INTERMEDIATE'
            : 'BASIC';

    // Detect architecture from file structure
    const architecture = detectArchitecture(tree);

    // AI-powered analysis (with timeout fallback)
    let aiAnalysis: any = null;
    try {
        Logger.info(`[Analyzer] Fetching core files for AI analysis: ${repoName}`);
        const codeFiles = await ghAnalyzer.fetchCoreFiles(repoName, tree);

        Logger.info(`[Analyzer] Requesting AI analysis for ${repoName} (${codeFiles.length} files)`);
        aiAnalysis = await brain.analyzeGitHubProject(
            repoName,
            repo.description || '',
            (readmeText as string).slice(0, 1500),
            codeFiles
        );
    } catch (e: any) {
        Logger.warn('[Analyzer] AI analysis failed for repo', { repo: repoName, error: e.message });
    }

    return {
        name: repoName,
        source: 'github',
        description: repo.description || '',
        techStack,
        complexity: aiAnalysis?.complexity || complexity,
        architecture: aiAnalysis?.architecturePatterns?.[0] || architecture,
        analysisDepth: 'deep',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        commitCount,
        testCoverage: hasTests,
        url: repo.html_url || '',
        language: repo.language || '',
        priorityScore: computePriority(repo),
        lastUpdated: repo.pushed_at,
    };
}

// ────────────────────────── skill details builder ──────────────────────────

function buildSkillDetails(report: UnifiedAnalysisReport): SkillDetail[] {
    const skillMap = new Map<string, SkillDetail>();

    // From GitHub projects
    for (const project of report.github.projects) {
        for (const tech of project.techStack) {
            const key = tech.toLowerCase();
            if (!skillMap.has(key)) {
                skillMap.set(key, {
                    name: tech,
                    category: categorizeSkill(tech) as any,
                    proficiency: 'beginner',
                    evidence: { repos: [], commitCount: 0, linesEstimate: 0 },
                    onResume: false,
                    verified: false,
                });
            }
            const detail = skillMap.get(key)!;
            if (!detail.evidence.repos.includes(project.name)) {
                detail.evidence.repos.push(project.name);
            }
            detail.evidence.commitCount += project.commitCount || 0;
        }
    }

    // Calculate proficiency based on evidence
    for (const [, detail] of skillMap) {
        const repoCount = detail.evidence.repos.length;
        const commits = detail.evidence.commitCount;
        if (repoCount >= 5 || commits >= 100) detail.proficiency = 'expert';
        else if (repoCount >= 3 || commits >= 50) detail.proficiency = 'advanced';
        else if (repoCount >= 2 || commits >= 20) detail.proficiency = 'intermediate';
        else detail.proficiency = 'beginner';
    }

    // Cross-reference with resume
    for (const skill of report.resume.skills) {
        const key = skill.toLowerCase();
        if (skillMap.has(key)) {
            skillMap.get(key)!.onResume = true;
            skillMap.get(key)!.verified = true;
        } else {
            skillMap.set(key, {
                name: skill,
                category: categorizeSkill(skill) as any,
                proficiency: 'beginner',
                evidence: { repos: [], commitCount: 0, linesEstimate: 0 },
                onResume: true,
                verified: false,  // on resume but no GitHub evidence
            });
        }
    }

    // Sort by proficiency level (expert first)
    const order = { expert: 0, advanced: 1, intermediate: 2, beginner: 3 };
    return [...skillMap.values()].sort((a, b) => order[a.proficiency] - order[b.proficiency]);
}

// ────────────────────────── utility functions ──────────────────────────

function categorizeSkill(skill: string): string {
    const s = skill.toLowerCase();
    const languages = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'dart', 'lua', 'html', 'css', 'sql', 'shell', 'bash'];
    const frameworks = ['react', 'angular', 'vue', 'next', 'nuxt', 'svelte', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails', 'laravel', 'flutter', 'electron', 'nest'];
    const tools = ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions', 'circleci', 'webpack', 'vite', 'babel', 'eslint', 'prettier', 'jest', 'pytest', 'git'];
    const platforms = ['aws', 'azure', 'gcp', 'firebase', 'vercel', 'netlify', 'heroku', 'digitalocean', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'];

    if (languages.some(l => s.includes(l))) return 'language';
    if (frameworks.some(f => s.includes(f))) return 'framework';
    if (tools.some(t => s.includes(t))) return 'tool';
    if (platforms.some(p => s.includes(p))) return 'platform';
    return 'concept';
}

function detectArchitecture(tree: any[]): string {
    const paths = tree.map((f: any) => (f.path || '').toLowerCase());
    const hasFile = (pattern: string) => paths.some(p => p.includes(pattern));

    if (hasFile('docker-compose') || hasFile('kubernetes') || hasFile('k8s'))
        return 'Microservices';
    if (hasFile('src/components') || hasFile('src/pages'))
        return 'Component-Based SPA';
    if (hasFile('src/routes') || hasFile('src/controllers'))
        return 'MVC / REST API';
    if (hasFile('handler') || hasFile('lambda'))
        return 'Serverless';
    if (hasFile('setup.py') || hasFile('pyproject.toml'))
        return 'Python Package';
    if (hasFile('lib/') || hasFile('src/index'))
        return 'Library';
    return 'Monolith';
}
