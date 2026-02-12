import axios from 'axios';

const API_URL = 'http://localhost:3000'; // Adjust if backend runs on different port

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
        context?: string;
    } | null;
    done: boolean;
}

export interface InterviewSessionStatusResponse {
    sessionId: string;
    currentQuestion: {
        text: string;
        type: string;
        context?: string;
    } | null;
    status: 'active' | 'completed';
    satisfaction: number;
}

export const AppService = {
    // 1. GitHub Analysis
    analyzeGitHub: async (username: string, token?: string) => {
        const response = await api.post<GitHubAnalysisResponse>('/analyze-github', { username, token });
        return response.data;
    },

    // 2. Resume Verification
    verifyResume: async (file: File, username: string) => {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('username', username);
        const response = await api.post<ResumeVerificationResponse>('/verify-resume-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // 3. Interview Session
    startInterview: async (username: string, context: any) => {
        const response = await api.post<InterviewStartResponse>('/interview/start', {
            username,
            context,
            brainType: 'local', // Defaulting to local as per config
            enableTraining: true
        });
        return response.data;
    },

    submitAnswer: async (sessionId: string, answer: string) => {
        const response = await api.post<InterviewAnswerResponse>('/interview/answer', { sessionId, answer });
        return response.data;
    },

    // 4. Growth & Progress
    getProgress: async (username: string) => {
        const response = await api.get(`/progress/${username}`);
        return response.data;
    },

    getNextAction: async (username: string) => {
        const response = await api.get(`/progress/${username}/next-action`);
        return response.data;
    },

    // 5. System Configuration
    getBrainConfig: async () => {
        const response = await api.get('/config/brain');
        return response.data;
    },

    updateBrainConfig: async (brainType: 'local' | 'remote', remoteUrl?: string) => {
        const response = await api.post('/config/brain', { brainType, remoteUrl });
        return response.data;
    },

    getSessionStatus: async (sessionId: string) => {
        const response = await api.get<InterviewSessionStatusResponse>(`/interview/session/${sessionId}`);
        return response.data;
    },

    checkHealth: async () => {
        try {
            const response = await api.get('/health');
            return response.status === 200;
        } catch {
            return false;
        }
    }
};
