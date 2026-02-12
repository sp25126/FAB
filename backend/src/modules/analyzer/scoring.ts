/**
 * Unified Analyzer – 7-Dimension Scoring Engine
 *
 * Computes a production-grade scorecard from combined GitHub + Resume data.
 *
 * Dimensions:
 *   Technical Depth    25%
 *   Code Quality       15%
 *   Portfolio Impact    15%
 *   Resume Honesty     15%
 *   Growth & Activity  10%
 *   Communication      10%
 *   Skill Breadth      10%
 */

import { DimensionScore, ScoreCard } from './types';

// ────────────────────────── scoring input ──────────────────────────

export interface ScoringInput {
    repoCount: number;
    originalRepoCount: number;
    totalStars: number;
    totalCommits: number;
    totalForks: number;
    languages: string[];
    deepProjects: {
        name: string;
        complexity: string;
        testCoverage: boolean;
        architecture: string;
        techStack: string[];
        commitCount: number;
        readmeContent: string;
        stars: number;
        forks: number;
        hasCI: boolean;
        hasLinting: boolean;
        dependencyCount: number;
    }[];
    verificationResults: {
        skill: string;
        verdict: string;
        evidenceStrength: string;
    }[];
    totalClaims: number;
    verifiedClaims: number;
    overclaimed: number;
    recentActivityDays: number;
    languageDiversity: number;
    contributorProjects: number;  // projects with >1 contributor
}

// ────────────────────────── grading ──────────────────────────

function toGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D+';
    if (score >= 45) return 'D';
    if (score >= 40) return 'D-';
    return 'F';
}

function clamp(v: number, min = 0, max = 100): number {
    return Math.min(Math.max(Math.round(v), min), max);
}

// ────────────────────────── 7 dimension scorers ──────────────────────────

function scoreTechnicalDepth(input: ScoringInput): DimensionScore {
    let score = 0;
    const p = input.deepProjects;
    const tips: string[] = [];

    // Complexity distribution (max 35)
    const adv = p.filter(x => x.complexity === 'ADVANCED').length;
    const mid = p.filter(x => x.complexity === 'INTERMEDIATE').length;
    score += Math.min(adv * 12, 24) + Math.min(mid * 5, 11);
    if (adv === 0) tips.push('Build at least one advanced-complexity project (e.g., real-time system, ML pipeline)');

    // Testing presence (max 20)
    const tested = p.filter(x => x.testCoverage).length;
    const testRatio = p.length > 0 ? tested / p.length : 0;
    score += clamp(testRatio * 20, 0, 20);
    if (testRatio < 0.5) tips.push('Add unit tests to more projects — aim for 50%+ coverage');

    // Tech stack breadth (max 25)
    const uniqueTech = new Set(p.flatMap(x => x.techStack));
    score += Math.min(uniqueTech.size * 3, 25);

    // Architecture variety (max 20)
    const arches = new Set(p.map(x => x.architecture).filter(a => a && a !== 'Unknown'));
    score += Math.min(arches.size * 7, 20);
    if (arches.size <= 1) tips.push('Explore different architectures: microservices, event-driven, serverless');

    return {
        name: 'Technical Depth', score: clamp(score), weight: 0.25,
        weighted: clamp(score * 0.25), grade: toGrade(clamp(score)),
        details: `${adv} advanced, ${mid} intermediate. ${tested}/${p.length} tested. ${uniqueTech.size} technologies.`,
        tips
    };
}

function scoreCodeQuality(input: ScoringInput): DimensionScore {
    let score = 0;
    const p = input.deepProjects;
    const tips: string[] = [];

    // Test coverage ratio (max 30)
    const tested = p.filter(x => x.testCoverage).length;
    score += clamp((tested / Math.max(p.length, 1)) * 30, 0, 30);

    // CI/CD presence (max 25)
    const withCI = p.filter(x => x.hasCI).length;
    score += clamp((withCI / Math.max(p.length, 1)) * 25, 0, 25);
    if (withCI === 0) tips.push('Add CI/CD (GitHub Actions) to at least your top project');

    // Linting/formatting (max 20)
    const withLint = p.filter(x => x.hasLinting).length;
    score += clamp((withLint / Math.max(p.length, 1)) * 20, 0, 20);
    if (withLint === 0) tips.push('Add ESLint/Prettier config to enforce code style');

    // Commit volume as proxy for iteration (max 25)
    const avgCommits = p.length > 0 ? p.reduce((s, x) => s + x.commitCount, 0) / p.length : 0;
    score += Math.min(Math.round(avgCommits / 3), 25);

    return {
        name: 'Code Quality', score: clamp(score), weight: 0.15,
        weighted: clamp(score * 0.15), grade: toGrade(clamp(score)),
        details: `${tested}/${p.length} tested, ${withCI} with CI, ${withLint} with linting. ${Math.round(avgCommits)} avg commits.`,
        tips
    };
}

function scorePortfolioImpact(input: ScoringInput): DimensionScore {
    let score = 0;
    const tips: string[] = [];

    // Originality (max 25)
    const origRatio = input.repoCount > 0 ? input.originalRepoCount / input.repoCount : 0;
    score += clamp(origRatio * 25, 0, 25);

    // Stars as external validation (max 25)
    score += Math.min(input.totalStars * 2, 25);
    if (input.totalStars < 5) tips.push('Promote your best project on social media, dev communities, or Reddit');

    // Forks indicate reusability (max 20)
    score += Math.min(input.totalForks * 3, 20);

    // Real-world utility — projects with descriptions (max 15)
    const described = input.deepProjects.filter(p => p.name && p.name.length > 3).length;
    score += clamp((described / Math.max(input.deepProjects.length, 1)) * 15, 0, 15);

    // Multi-contributor projects (max 15)
    score += Math.min(input.contributorProjects * 5, 15);
    if (input.contributorProjects === 0) tips.push('Contribute to open-source projects to show collaboration skills');

    return {
        name: 'Portfolio Impact', score: clamp(score), weight: 0.15,
        weighted: clamp(score * 0.15), grade: toGrade(clamp(score)),
        details: `${input.originalRepoCount}/${input.repoCount} original. ${input.totalStars} stars, ${input.totalForks} forks. ${input.contributorProjects} collaborative.`,
        tips
    };
}

function scoreResumeHonesty(input: ScoringInput): DimensionScore {
    let score = 0;
    const tips: string[] = [];

    if (input.totalClaims > 0) {
        // Verified ratio (max 60)
        score += clamp((input.verifiedClaims / input.totalClaims) * 60, 0, 60);

        // Penalty for overclaims
        const penalty = clamp((input.overclaimed / input.totalClaims) * 30, 0, 30);
        score = Math.max(score - penalty, 0);
        if (input.overclaimed > 0) tips.push(`Remove or downgrade ${input.overclaimed} overclaimed skills from your resume`);

        // Bonus for strong evidence (max 40)
        const strong = input.verificationResults.filter(v => v.evidenceStrength === 'STRONG').length;
        score += Math.min(clamp((strong / input.totalClaims) * 40, 0, 40), 40);
    } else {
        tips.push('Upload your resume so we can verify your claims against your GitHub profile');
    }

    return {
        name: 'Resume Honesty', score: clamp(score), weight: 0.15,
        weighted: clamp(score * 0.15), grade: toGrade(clamp(score)),
        details: `${input.verifiedClaims}/${input.totalClaims} verified. ${input.overclaimed} overclaimed.`,
        tips
    };
}

function scoreGrowthActivity(input: ScoringInput): DimensionScore {
    let score = 0;
    const tips: string[] = [];

    // Recent activity (max 40)
    if (input.recentActivityDays <= 7) score += 40;
    else if (input.recentActivityDays <= 30) score += 30;
    else if (input.recentActivityDays <= 90) score += 20;
    else if (input.recentActivityDays <= 180) score += 10;
    else tips.push('Push code at least weekly to show consistent activity');

    // Language diversity (max 30)
    score += Math.min(input.languageDiversity * 5, 30);

    // Total commits (max 30)
    score += Math.min(Math.round(input.totalCommits / 10), 30);
    if (input.totalCommits < 100) tips.push('Increase commit frequency — consistent contributions matter more than bursts');

    return {
        name: 'Growth & Activity', score: clamp(score), weight: 0.10,
        weighted: clamp(score * 0.10), grade: toGrade(clamp(score)),
        details: `Active ${input.recentActivityDays}d ago. ${input.languageDiversity} languages. ${input.totalCommits} total commits.`,
        tips
    };
}

function scoreCommunication(input: ScoringInput): DimensionScore {
    let score = 0;
    const p = input.deepProjects;
    const tips: string[] = [];

    // README quality (max 50)
    const goodReadme = p.filter(x => (x.readmeContent || '').length > 300).length;
    score += clamp((goodReadme / Math.max(p.length, 1)) * 50, 0, 50);
    if (goodReadme < p.length * 0.5) tips.push('Write detailed READMEs with setup instructions, screenshots, and usage examples');

    // Active commit history (max 25)
    const wellCommitted = p.filter(x => x.commitCount > 10).length;
    score += clamp((wellCommitted / Math.max(p.length, 1)) * 25, 0, 25);

    // Dependency documentation — having package.json etc. (max 25)
    const hasDeps = p.filter(x => x.dependencyCount > 0).length;
    score += clamp((hasDeps / Math.max(p.length, 1)) * 25, 0, 25);

    return {
        name: 'Communication', score: clamp(score), weight: 0.10,
        weighted: clamp(score * 0.10), grade: toGrade(clamp(score)),
        details: `${goodReadme}/${p.length} with detailed README. ${wellCommitted} well-committed.`,
        tips
    };
}

function scoreSkillBreadth(input: ScoringInput): DimensionScore {
    let score = 0;
    const tips: string[] = [];

    // Language count (max 30)
    score += Math.min(input.languageDiversity * 5, 30);
    if (input.languageDiversity < 3) tips.push('Learn at least 3 languages to demonstrate versatility');

    // Tech stack diversity (max 35)
    const allTech = new Set(input.deepProjects.flatMap(x => x.techStack));
    score += Math.min(allTech.size * 3, 35);

    // Domain coverage — architecture diversity proxy (max 35)
    const domains = new Set(input.deepProjects.map(x => x.architecture).filter(a => a && a !== 'Unknown'));
    score += Math.min(domains.size * 8, 35);
    if (domains.size <= 1) tips.push('Build projects across different domains: backend, frontend, data, DevOps');

    return {
        name: 'Skill Breadth', score: clamp(score), weight: 0.10,
        weighted: clamp(score * 0.10), grade: toGrade(clamp(score)),
        details: `${input.languageDiversity} languages, ${allTech.size} technologies, ${domains.size} domains.`,
        tips
    };
}

// ────────────────────────── public API ──────────────────────────

export function computeScoreCard(input: ScoringInput): ScoreCard {
    const dimensions: DimensionScore[] = [
        scoreTechnicalDepth(input),
        scoreCodeQuality(input),
        scorePortfolioImpact(input),
        scoreResumeHonesty(input),
        scoreGrowthActivity(input),
        scoreCommunication(input),
        scoreSkillBreadth(input),
    ];

    const overall = dimensions.reduce((sum, d) => sum + d.weighted, 0);

    const sorted = [...dimensions].sort((a, b) => b.score - a.score);
    const strengths = sorted.filter(d => d.score >= 65).map(d => d.name);
    const weaknesses = sorted.filter(d => d.score < 50).map(d => d.name);

    return {
        overall: clamp(overall),
        overallGrade: toGrade(clamp(overall)),
        dimensions,
        strengths,
        weaknesses,
    };
}
