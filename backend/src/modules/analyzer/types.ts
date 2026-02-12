
// ────────────────────────── Skill Details ──────────────────────────

export interface SkillDetail {
    name: string;
    category: 'language' | 'framework' | 'tool' | 'concept' | 'platform';
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    evidence: {
        repos: string[];          // repo names that prove this skill
        commitCount: number;      // total commits across repos using this skill
        linesEstimate: number;    // approx LOC from language stats
    };
    onResume: boolean;
    verified: boolean;
}

// ────────────────────────── Verification ──────────────────────────

export interface UnifiedSkillVerification {
    skill: string;
    category: string;
    verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT' | 'NOT_ON_RESUME';
    confidence: number;
    reasoning: string;
    recommendation?: string;
    projectIdea?: string;
    learningPath?: string;
}

// ────────────────────────── Projects ──────────────────────────

export interface AnalysisProject {
    name: string;
    source: 'github' | 'resume' | 'both';
    description: string;
    techStack: string[];
    complexity: string;
    architecture: string;
    analysisDepth: 'light' | 'deep';   // whether this project has been deeply analyzed
    stars?: number;
    forks?: number;
    commitCount?: number;
    testCoverage?: boolean;
    url?: string;
    language?: string;
    priorityScore?: number;             // for sorting: stars*2 + forks + recency bonus
    lastUpdated?: string;
}

// ────────────────────────── Insights ──────────────────────────

export interface Insight {
    type: 'strength' | 'gap' | 'recommendation';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

export interface Recommendation {
    title: string;
    description: string;
    techStack: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

// ────────────────────────── Score Dimensions ──────────────────────────

export interface DimensionScore {
    name: string;
    score: number;       // 0-100
    weight: number;      // as decimal
    weighted: number;    // score * weight
    grade: string;       // A+ … F
    details: string;
    tips: string[];      // actionable improvement suggestions
}

export interface ScoreCard {
    overall: number;
    overallGrade: string;
    dimensions: DimensionScore[];
    strengths: string[];
    weaknesses: string[];
}

// ────────────────────────── Main Report ──────────────────────────

export interface UnifiedAnalysisReport {
    id: string;
    username: string;
    timestamp: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    progress: {
        phase: string;
        percent: number;
        detail?: string;      // sub-step info e.g. "Analyzing repo 3/10"
    };

    scores: {
        honesty: number;
        depth: number;
        breadth: number;
        experience: number;
        readiness: number;
    };

    scorecard?: ScoreCard;     // new 7-dimension scorecard

    skillDetails: SkillDetail[];  // rich skill breakdown with evidence

    resume: {
        claims: Array<{ skill: string; category: string; evidenceStrength: string }>;
        projects: AnalysisProject[];
        summary: string;
        skills: string[];
    };

    github: {
        projects: AnalysisProject[];
        totalRepos: number;
        techStack: string[];
        totalStars: number;
        totalForks: number;
    };

    verification: {
        verified: UnifiedSkillVerification[];
        overclaimed: UnifiedSkillVerification[];
        weak: UnifiedSkillVerification[];
    };

    insights: {
        strengths: Insight[];
        gaps: Insight[];
        recommendations: Recommendation[];
    };

    metadata: {
        resumeFileName?: string;
        githubUsername: string;
        analysisMode: 'DEEP' | 'LIGHT';
        processingTime: number;
    };

    errors: string[];
}
