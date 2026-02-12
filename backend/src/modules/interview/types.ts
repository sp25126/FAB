export interface Question {
    text: string;
    context: string;
    expectedPoints: string[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    source?: string;
    type: 'TECHNICAL' | 'PROJECT' | 'BEHAVIORAL' | 'SYSTEM_DESIGN' | 'CODE_CHALLENGE';
    interviewerIdentity?: {
        name: string;
        role: string;
        avatarUrl?: string;
        tone: 'Aggressive' | 'Neutral' | 'Supportive' | 'Nitpicky';
    };
    shadowNotes?: string; // Internal AI reasoning not shown to candidate
}

export interface CandidateContext {
    skills: string[];
    experience: any[];
    projects: any[];
    githubStats?: any;
    summary?: string;
    weaknesses?: string[]; // Phase 7: Contextual Memory
    resumeData?: any; // [NEW] Full parsed resume
    growthHistory?: any[]; // [NEW] Analysis history (gaps, trajectory)
    candidateIntelligence?: any; // [NEW] Long-term memory/intelligence
    currentInterviewer?: {
        name: string;
        role: string;
        tone: string;
        shadowNotes?: string; // [NEW] Previous interviewer's secret thoughts
    };
    pressureMeter?: number;
    techTrends?: string[]; // [NEW] Real-time market intel
}

export type InterviewContext = CandidateContext;
