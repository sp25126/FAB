
import { RAGQuestioner, CandidateContext, Question } from './rag-questioner';
import { BrainType } from '../llm/factory';

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
    ragQuestioner: RAGQuestioner;
}

export class InterviewSessionManager {
    private sessions: Map<string, InterviewSession> = new Map();

    async createSession(
        username: string,
        context: CandidateContext,
        brainType: BrainType = 'local'
    ): Promise<InterviewSession> {
        const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const rag = new RAGQuestioner(context, brainType);

        // Initialize RAG (scrape background questions)
        rag.initialize().catch(err => console.warn('RAG init warning:', err));

        const session: InterviewSession = {
            id: sessionId,
            username,
            context,
            currentQuestion: null,
            questionHistory: [],
            satisfactionScore: 50, // Start neutral
            status: 'active',
            startedAt: new Date(),
            ragQuestioner: rag
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

        // Generate Q via RAG
        const questions = await session.ragQuestioner.generateQuestions(1);
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

        // Evaluate answer via LLM
        const evaluation = await session.ragQuestioner.evaluateAnswer(answer, session.currentQuestion);

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
}
