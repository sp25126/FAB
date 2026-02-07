
import { AIQuestioner } from './ai-questioner';
import { CandidateContext, Question } from './types';
import { BrainType } from '../llm/factory';
import { HistoryStorage, InterviewRecord } from '../history/storage';

export interface InterviewSession {
    id: string;
    username: string;
    context: CandidateContext;
    currentQuestion: Question | null;
    questionHistory: {
        question: string;
        answer: string;
        score: number;
        feedback: string;
        redFlags: string[];
    }[];
    satisfactionScore: number; // 0-100
    status: 'active' | 'completed';
    startedAt: Date;
    aiQuestioner: AIQuestioner;
    projectsFocused: Set<string>;
}

export class InterviewSessionManager {
    private sessions: Map<string, InterviewSession> = new Map();

    async createSession(
        username: string,
        context: CandidateContext,
        brainType: BrainType = 'local'
    ): Promise<InterviewSession> {
        const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ai = new AIQuestioner(context, brainType);

        // AI Questioner is on-demand, no bg init needed

        const session: InterviewSession = {
            id: sessionId,
            username,
            context,
            currentQuestion: null,
            questionHistory: [],
            satisfactionScore: 50, // Start neutral
            status: 'active',
            startedAt: new Date(),
            aiQuestioner: ai,
            projectsFocused: new Set()
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId: string): InterviewSession | null {
        return this.sessions.get(sessionId) || null;
    }

    async getNextQuestion(sessionId: string): Promise<Question | null> {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') return null;

        // Check termination conditions
        if (this.shouldEndInterview(session)) {
            session.status = 'completed';
            return null;
        }

        // Generate Q via AI (Agentic Mode: Pass History)
        const questions = await session.aiQuestioner.generateQuestions(session.questionHistory, 1);
        if (questions && questions.length > 0) {
            session.currentQuestion = questions[0];
            return questions[0];
        }

        return null; // Should not happen ideally
    }

    async submitAnswer(sessionId: string, answer: string): Promise<any> {
        const session = this.sessions.get(sessionId);
        if (!session || !session.currentQuestion) {
            throw new Error('No active question or session');
        }

        // Evaluate answer via AI
        const evaluation = await session.aiQuestioner.evaluateAnswer(answer, session.currentQuestion);

        // Update satisfaction score using moving average-ish approach
        const momentum = 0.25; // Slightly faster shift
        session.satisfactionScore = (session.satisfactionScore * (1 - momentum)) + (evaluation.score * momentum);

        // Record history
        session.questionHistory.push({
            question: session.currentQuestion.text,
            answer,
            score: evaluation.score,
            feedback: evaluation.feedback,
            redFlags: evaluation.redFlags
        });

        // Track project focus
        if (session.currentQuestion.type === 'PROJECT' && session.currentQuestion.context) {
            session.projectsFocused.add(session.currentQuestion.context);
        }

        return {
            score: evaluation.score,
            feedback: evaluation.feedback,
            satisfaction: Math.round(session.satisfactionScore),
            redFlags: evaluation.redFlags
        };
    }

    private shouldEndInterview(session: InterviewSession): boolean {
        const count = session.questionHistory.length;

        // Max limit
        if (count >= 25) return true;

        // Early termination if VERY satisfied (after min 5 Qs)
        if (count >= 5 && session.satisfactionScore > 85) return true;

        // Early termination if FAILED (after min 5 Qs)
        if (count >= 5 && session.satisfactionScore < 30) return true;

        return false;
    }



    getSessionSummary(sessionId: string): any {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const passed = session.satisfactionScore >= 70;

        return {
            sessionId,
            totalQuestions: session.questionHistory.length,
            finalSatisfaction: Math.round(session.satisfactionScore),
            passed,
            verdict: passed
                ? "HIRE: Candidate demonstrated solid technical depth."
                : "NO HIRE: Candidate failed to defend their resume claims.",
            history: session.questionHistory
        };
    }

    async completeSession(sessionId: string): Promise<InterviewRecord> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');

        session.status = 'completed';

        // Determine verdict
        let verdict: 'FAIL' | 'WEAK' | 'PASS' | 'STRONG';
        if (session.satisfactionScore < 50) verdict = 'FAIL';
        else if (session.satisfactionScore < 65) verdict = 'WEAK';
        else if (session.satisfactionScore < 80) verdict = 'PASS';
        else verdict = 'STRONG';

        // Identify weakest skills
        const weakestSkills = session.questionHistory
            .filter(q => q.score < 60)
            .map(q => "General")
            .slice(0, 3);

        const record: InterviewRecord = {
            id: sessionId,
            username: session.username,
            timestamp: new Date().toISOString(),
            score: Math.round(session.satisfactionScore),
            questionsAsked: session.questionHistory.length,
            questionsAnswered: session.questionHistory.length,
            skillsTested: Array.from(new Set(session.context.skills)),
            redFlags: session.questionHistory.reduce((acc, q) => acc + (q.redFlags ? q.redFlags.length : 0), 0),
            verdict,
            projectsFocused: Array.from(session.projectsFocused),
            weakestSkills: Array.from(new Set(weakestSkills))
        };

        const storage = new HistoryStorage(session.username);
        await storage.saveRecord(record);

        return record;
    }
}
