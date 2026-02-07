export interface Question {
    text: string;
    context: string;
    expectedPoints: string[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    source?: string;
    type: 'TECHNICAL' | 'PROJECT' | 'BEHAVIORAL' | 'SYSTEM_DESIGN';
}

export interface CandidateContext {
    skills: string[];
    experience: any[];
    projects: any[];
    githubStats?: any;
    summary?: string;
    weaknesses?: string[]; // Phase 7: Contextual Memory
}

export type InterviewContext = CandidateContext;
