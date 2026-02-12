import { apiClient } from './client';

// Types
export interface GitHubAnalysisResponse {
    username: string;
    projectCount: number;
    analysisMode: 'DEEP' | 'LIGHT';
    projects: any[];
}

export interface ResumeVerificationResponse {
    username: string;
    claimsFound: number;
    verification: any[];
    summary: { honestyScore: number };
    resumeBio: string;
    projects: any[]; // [NEW]
}

export interface InterviewStartResponse {
    sessionId: string;
    firstQuestion: string;
}

export interface InterviewAnswerResponse {
    feedback: string;
    score: number;
    satisfaction: number;
    nextQuestion: {
        text: string;
        type: string;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
        context?: string;
        interviewerIdentity?: {
            name: string;
            role: string;
            tone: string;
        };
    } | null;
    done: boolean;
    redFlags?: string[];
    breakdown?: { accuracy: number; depth: number; communication: number };
    vibe?: { clarity: number; confidence: number; brevity: number };
    shadowNotes?: string;
}

export interface BrainConfigResponse {
    brainType: 'local' | 'remote';
    status: 'configured' | 'missing_url';
    remoteUrl?: string;
}

export interface GrowthHistoryItem {
    date: string;
    metric: string;
    value: number;
    details?: any;
}

export interface UserProfile {
    username: string;
    bio: string;
    experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
    targetRole: string;
    skills: Record<string, number>;
    growthHistory: GrowthHistoryItem[];
    projects: any[];

    resume?: {
        experience: any[];
        education: any[];
        skills: string[];
        summary: string;
    };
    analysis?: {
        strengths: string[];
        gaps: string[];
        recommendations: string[];
    };
    completedProjects?: string[];
    avatarUrl?: string;
    githubUrl?: string;
    name?: string;
    lastActive?: string;
    stats?: {
        projects: number;
        commits?: number;
    };
}

export interface ProjectProposal {
    title: string;
    description: string;
    techStack: string[];
    difficulty: number;
    estimatedHours: number;
    requirements: string[];
    skillsTargeted: string[];
    estimatedDuration: string;
}

export interface UnifiedAnalysisResult {
    scores: {
        honesty: number;
        depth: number;
        breadth: number;
        experience: number;
        readiness: number;
    };
    resume: {
        claims: Array<{ skill: string; category: string }>;
        projects: any[];
        summary: string;
        skills: string[];
    };
    github: {
        projects: any[];
        totalRepos: number;
        techStack: string[];
        totalStars: number;
        totalForks: number;
    };
    verification: {
        verified: any[];
        overclaimed: any[];
        weak: any[];
    };
    insights: {
        strengths: any[];
        gaps: any[];
        recommendations: any[];
    };
    metadata: {
        resumeFileName: string;
        githubUsername: string;
        processingTime: number;
    };
    errors?: string[]; // [NEW] Capture analysis errors
}

export interface InterviewHistoryItem {
    sessionId: string;
    date: string;
    score: number;
    topics: string[];
    feedback: string;
    breakdown?: { accuracy: number; depth: number; communication: number };
}

export interface ActiveChallenge {
    id: string;
    name: string;
    description: string;
    status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    startedAt: string;
    techStack: string[];
    roadmap?: any;
}


export const AppService = {
    // 1. GitHub Analysis
    listRepos: async (username: string, token?: string) => {
        const response = await apiClient.post<{ username: string; repoCount: number; repos: any[] }>('/github/repos', { username, token });
        return response.data;
    },

    analyzeDeep: async (username: string, count: number = 10, token?: string) => {
        const response = await apiClient.post<GitHubAnalysisResponse>('/github/analyze-deep', { username, count, token });
        return response.data;
    },

    getGithubHistory: async (username: string) => {
        const response = await apiClient.get<GitHubAnalysisResponse>(`/github/history/${username}`);
        return response.data;
    },

    // Legacy (Redirects to Deep)
    analyzeGitHub: async (username: string, token?: string) => {
        const response = await apiClient.post<GitHubAnalysisResponse>('/analyze-github', { username, token });
        return response.data;
    },
    verifyResume: async (file: File, username: string) => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('username', username);
        const response = await apiClient.post<ResumeVerificationResponse>('/verify-resume-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // NEW: Unified Analysis (Resume + GitHub)
    analyzeUnified: async (file: File, username: string, githubToken: string) => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        const response = await apiClient.post('/analyze/unified', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // 3. Interview Session
    startInterview: async (username: string, context: any, brainType: 'local' | 'remote' = 'local', enableTraining = true) => {
        const response = await apiClient.post<InterviewStartResponse>('/interview/start', {
            username,
            context,
            brainType,
            enableTraining
        });
        return response.data;
    },

    getSessionStatus: async (sessionId: string) => {
        const response = await apiClient.get<{
            id: string;
            status: string;
            currentQuestion: any;
            questionCount: number;
            transcriptLength: number;
            satisfaction: number;
            done: boolean;
            lastFeedback?: string | null;
        }>(`/interview/status/${sessionId}`);
        return response.data;
    },

    submitAnswer: async (sessionId: string, answer: string) => {
        const response = await apiClient.post<InterviewAnswerResponse>('/interview/answer', { sessionId, answer });
        return response.data;
    },

    getInterviewSummary: async (sessionId: string, username?: string) => {
        const response = await apiClient.get(`/interview/summary/${sessionId}`, { params: { username } });
        return response.data;
    },

    stopInterview: async (sessionId: string) => {
        const response = await apiClient.post('/interview/stop', { sessionId });
        return response.data;
    },

    // 4. Growth & Progress
    getProgress: async (username: string) => {
        const response = await apiClient.get(`/progress/${username}`);
        return response.data;
    },

    getProjects: async (username: string) => {
        const response = await apiClient.get(`/progress/${username}/projects`);
        return response.data;
    },

    getProjectImpact: async (username: string) => {
        const response = await apiClient.get(`/progress/${username}/projects`);
        return response.data;
    },

    getNextAction: async (username: string) => {
        const response = await apiClient.get(`/progress/${username}/next-action`);
        return response.data;
    },

    getInterviewHistory: async (username: string) => {
        const response = await apiClient.get<InterviewHistoryItem[]>(`/growth/${username}/interviews`);
        return response.data;
    },

    getActiveChallenges: async (username: string) => {
        const response = await apiClient.get<ActiveChallenge[]>(`/growth/${username}/challenges`);
        return response.data;
    },

    // 5. System Configuration
    getBrainConfig: async () => {
        const response = await apiClient.get<BrainConfigResponse>('/config/brain');
        return response.data;
    },

    updateBrainConfig: async (brainType: 'local' | 'remote', remoteUrl?: string) => {
        const response = await apiClient.post('/config/brain', { brainType, remoteUrl });
        return response.data;
    },

    checkHealth: async () => {
        try {
            const response = await apiClient.get('/health');
            return response.status === 200;
        } catch {
            return false;
        }
    },

    // 6. User Profile
    getProfile: async (username: string) => {
        const response = await apiClient.get(`/profile/${username}`);
        return response.data;
    },

    updateProfile: async (profile: any) => {
        const response = await apiClient.post('/profile', profile);
        return response.data;
    },

    // 7. Coaching
    getCoachingSuggestion: async (username: string) => {
        const response = await apiClient.get(`/coaching/suggest/${username}`);
        return response.data;
    },

    acceptProjectChallenge: async (username: string, projectIdea: any) => {
        const response = await apiClient.post<{ success: boolean; roadmap?: any }>('/coaching/accept', { username, projectIdea });
        return response.data;
    },

    completeProject: async (username: string, projectId: string) => {
        const response = await apiClient.post('/coaching/complete', { username, projectId });
        return response.data;
    },

    // 8. Auth
    getGithubLoginUrl: async () => {
        const response = await apiClient.get<{ url: string }>('/auth/github/login');
        return response.data;
    },

    exchangeGithubCode: async (code: string) => {
        const response = await apiClient.post<{ username: string, token: string }>('/auth/github/exchange', { code });
        return response.data;
    },

    // 9. Unified Analyzer
    startDeepSearch: async (username: string, token: string, file?: File) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('token', token);
        if (file) formData.append('resume', file);
        const response = await apiClient.post<{ analysisId: string; status: string }>('/analyzer/deep-search', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getAnalyzerStatus: async (id: string) => {
        const response = await apiClient.get<{ id: string; status: string; progress: { phase: string; percent: number } }>(`/analyzer/status/${id}`);
        return response.data;
    },

    getAnalyzerReport: async (id: string) => {
        const response = await apiClient.get(`/analyzer/report/${id}`);
        return response.data;
    },

    getLatestAnalyzerStatus: async (username: string) => {
        const response = await apiClient.get<{ id?: string; status: string; progress?: { phase: string; percent: number } }>(`/analyzer/latest-status/${username}`);
        return response.data;
    },

    // ==================== INTERACTIVE ANALYZER FEATURES ====================

    // Feature 1: Ultra-Deep Project Analysis
    analyzeProjectDeep: async (username: string, projectName: string, githubToken: string) => {
        const response = await apiClient.post('/analyze/project-deep', { username, projectName, githubToken });
        return response.data;
    },

    // Feature 2: Resume Gap Analyzer
    analyzeResumeGaps: async (file: File, username: string, githubToken: string, focusRole?: string, forceRefresh: boolean = false) => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        if (focusRole) formData.append('focusRole', focusRole);
        formData.append('forceRefresh', forceRefresh.toString());
        const response = await apiClient.post('/analyze/resume-gaps', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Feature 3: Project Comparator
    compareProjects: async (project1: string, project2: string, username: string, githubToken: string, compareType: 'internal' | 'external' = 'internal', externalUrl?: string, forceRefresh: boolean = false) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        formData.append('compareType', compareType);
        formData.append('project1', project1);
        if (project2) formData.append('project2', project2);
        if (externalUrl) formData.append('externalUrl', externalUrl);
        formData.append('forceRefresh', forceRefresh.toString());

        const response = await apiClient.post('/analyze/project-compare', formData, {
            headers: { 'Content-Type': 'multipart/form-data' } // Multer expects multipart
        });
        return response.data;
    },

    // Feature 4: Ultra-Deep Analysis
    analyzeDeepProject: async (projectName: string, username: string, githubToken: string, forceRefresh: boolean = false) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        formData.append('projectName', projectName);
        formData.append('forceRefresh', forceRefresh.toString());

        const response = await apiClient.post('/analyze/project-deep', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Feature 5: Code Quality
    analyzeCodeQuality: async (projectName: string, username: string, githubToken: string, forceRefresh: boolean = false) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        formData.append('projectName', projectName);
        formData.append('forceRefresh', forceRefresh.toString());

        const response = await apiClient.post('/analyze/code-quality', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Feature 6: Career Trajectory
    analyzeCareerTrajectory: async (username: string, githubToken: string, timeRange: string = 'all', forceRefresh: boolean = false) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('githubToken', githubToken);
        formData.append('timeRange', timeRange);
        formData.append('forceRefresh', forceRefresh.toString());

        const response = await apiClient.post('/analyze/career-trajectory', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
};
