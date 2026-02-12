export interface UnifiedAnalysisScores {
    honesty: number;        // 0-100: Resume claims vs GitHub evidence
    depth: number;          // 0-100: Project complexity and sophistication
    breadth: number;        // 0-100: Tech stack diversity
    experience: number;     // 0-100: Inferred from project types
    readiness: number;      // 0-100: Weighted average of all scores
}

export interface ResumeData {
    claims: ResumeClaim[];
    projects: ResumeProject[];
    summary: string;
    skills: string[];
}

export interface ResumeClaim {
    skill: string;
    category: string;
    confidence: number;
}

export interface ResumeProject {
    name: string;
    description: string;
    tech: string[]; // Using 'tech' instead of 'techStack' to match parser
    complexity?: string;
    learnedSkills?: string[];
    projectType?: string;
    realWorldUtility?: string;
    architecture?: string;
}

export interface GitHubData {
    projects: DeepProjectAnalysis[];
    totalRepos: number;
    techStack: string[];
    totalStars: number;
    totalForks: number;
}

export interface DeepProjectAnalysis {
    name: string;
    description: string;
    url?: string; // Made optional for compatibility
    language: string;
    stars: number;
    forks: number;
    techStack: string[];
    architecture?: string;
    complexity: string;
    coreFiles: { path: string; content: string }[]; // Match actual analyzer output
    learnedSkills: string[];
}

export interface VerificationData {
    verified: VerificationResult[];
    overclaimed: VerificationResult[];
    weak: VerificationResult[];
}

export interface VerificationResult {
    skill: string;
    verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT'; // Added FRAUDULENT
    evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
    githubEvidence: string;
    recommendation: string;
    projectIdea?: string;
    learningPath?: string;
    howToFix?: string;
}

export interface Insight {
    type: 'strength' | 'gap' | 'recommendation';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable?: boolean;
}

export interface Recommendation {
    title: string;
    description: string;
    techStack: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    estimatedTime: string;
}

export interface UnifiedAnalysis {
    scores: UnifiedAnalysisScores;
    resume: ResumeData;
    github: GitHubData;
    verification: VerificationData;
    insights: {
        strengths: Insight[];
        gaps: Insight[];
        recommendations: Recommendation[];
    };
    timestamp: string;
    metadata: {
        resumeFileName: string;
        githubUsername: string;
        analysisMode: 'DEEP' | 'LIGHT';
        processingTime: number;
    };
}
