
import { AIQuestioner } from './ai-questioner';
import { CandidateContext, Question } from './types';
import { BrainType } from '../llm/factory';
import { HistoryStorage, InterviewRecord } from '../history/storage';
import { ProfileRepository } from '../profile/repository';

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
        vibe?: { clarity: number; confidence: number; brevity: number };
        breakdown?: { accuracy: number; depth: number; communication: number };
        shadowNotes?: string;
    }[];
    satisfactionScore: number; // 0-100
    status: 'created' | 'questioning' | 'completed' | 'expired';
    startedAt: Date;
    lastActive: Date;
    aiQuestioner: AIQuestioner;
    projectsFocused: Set<string>;
    pressureMeter: number; // 0-100, increases difficulty and tone as it goes up
    currentInterviewer?: {
        name: string;
        role: string;
        tone: string;
        shadowNotes?: string;
    };
    questionQueue: Question[];
    projectMentionCount: Map<string, number>;
    activeDeepDive?: { projectName: string; questionsRemaining: number };
}

export class InterviewSessionManager {
    private sessions: Map<string, InterviewSession> = new Map();
    private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

    constructor() {
        // Start cleanup job every 5 minutes
        setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
    }

    private cleanupExpiredSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (now - session.lastActive.getTime() > this.SESSION_TTL) {
                console.log(`[Interview] Cleanup: Expired session ${id} for ${session.username}`);
                session.status = 'expired';
                this.sessions.delete(id);
            }
        }
    }

    async createSession(
        username: string,
        context: CandidateContext,
        brainType: BrainType = 'local'
    ): Promise<InterviewSession> {
        const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ai = new AIQuestioner(context, brainType);

        const session: InterviewSession = {
            id: sessionId,
            username,
            context,
            currentQuestion: null,
            questionHistory: [],
            satisfactionScore: 50,
            status: 'created',
            startedAt: new Date(),
            lastActive: new Date(),
            aiQuestioner: ai,
            projectsFocused: new Set(),
            pressureMeter: 0,
            currentInterviewer: {
                name: "FAB Manager",
                role: "Senior Engineering Manager",
                tone: "Brutally Honest"
            },
            questionQueue: [],
            projectMentionCount: new Map()
        };

        // Pre-populate queue
        const initialQuestions = await ai.generateQuestions([], 2);
        session.questionQueue = initialQuestions || [];

        this.sessions.set(sessionId, session);
        return session;
    }

    getSession(sessionId: string): InterviewSession | null {
        return this.sessions.get(sessionId) || null;
    }

    async getNextQuestion(sessionId: string): Promise<Question | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        session.lastActive = new Date(); // Reset TTL

        if (session.status === 'completed' || session.status === 'expired') return null;

        // [NEW] Pressure-based Persona Switching
        const interPanel = [
            { name: "FAB Manager", role: "Senior Engineering Manager", tone: "Brutally Honest", shadowNotes: "" },
            { name: "FAB Architect", role: "Principal Architect", tone: "Nitpicky & Deep", shadowNotes: "" },
            { name: "FAB Product", role: "Product Director", tone: "Business-Critical & Trade-offs", shadowNotes: "" },
            { name: "FAB Operations", role: "DevOps Lead", tone: "Reliability & Scale Focused", shadowNotes: "" }
        ];

        // Switch interviewer every 3 questions
        if (session.questionHistory.length % 3 === 0 && session.questionHistory.length > 0) {
            const previousNotes = session.currentInterviewer?.shadowNotes;
            session.currentInterviewer = interPanel[Math.floor(Math.random() * interPanel.length)];
            // Persona Handover: Pass secret notes to the next interviewer
            if (previousNotes) session.currentInterviewer.shadowNotes = previousNotes;
            console.log(`[Interview] Switching persona to: ${session.currentInterviewer.name}. Handover: ${!!previousNotes}`);
        }

        // Check termination conditions
        if (this.shouldEndInterview(session)) {
            session.status = 'completed';
            return null;
        }

        session.status = 'questioning';

        // Update context with session state for AI
        session.context.currentInterviewer = session.currentInterviewer;
        session.context.pressureMeter = session.pressureMeter;

        // Generate Q via AI (Agentic Mode: Pass History)
        // If queue has items, return the first one and replenish in background
        if (session.questionQueue.length > 0) {
            const next = session.questionQueue.shift()!;
            session.currentQuestion = next;

            // Async replenishment
            this.replenishQueue(session).catch(e => console.error("[Interview] Replenishment failed:", e));

            return next;
        }

        // Fallback for empty queue (should be rare)
        const questions = await session.aiQuestioner.generateQuestions(session.questionHistory, 1);
        if (questions && questions.length > 0) {
            session.currentQuestion = questions[0];
            return questions[0];
        }

        return null;
    }

    private async replenishQueue(session: InterviewSession) {
        if (session.questionQueue.length >= 2) return;

        console.log(`[Interview] Replenishing queue for ${session.id}...`);

        const options = session.activeDeepDive && session.activeDeepDive.questionsRemaining > 0
            ? { mode: 'DEEP_DIVE' as const, targetProject: session.activeDeepDive.projectName }
            : undefined;

        const newQs = await session.aiQuestioner.generateQuestions(session.questionHistory, 1, options);
        if (newQs && newQs.length > 0) {
            session.questionQueue.push(newQs[0]);

            // If we generated a deep-dive question, decrement the counter
            if (session.activeDeepDive && options?.mode === 'DEEP_DIVE') {
                session.activeDeepDive.questionsRemaining--;
                if (session.activeDeepDive.questionsRemaining <= 0) {
                    console.log(`[Interview] Deep-dive concluded for ${session.activeDeepDive.projectName}`);
                    delete session.activeDeepDive;
                }
            }
        }
    }

    async submitAnswer(sessionId: string, answer: string): Promise<any> {
        const session = this.sessions.get(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        session.lastActive = new Date();

        if (session.status === 'completed') {
            throw new Error('Interview already completed');
        }

        if (!session.currentQuestion) {
            // Self-repair: If somehow currentQuestion is missing but session is active, try to get one
            console.warn(`[WARN] Session ${sessionId} has no active question. Attempting recovery...`);
            const recovered = await this.getNextQuestion(sessionId);
            if (recovered) {
                return {
                    score: 0,
                    feedback: "Session state recovered. Please answer the new question provided.",
                    satisfaction: session.satisfactionScore,
                    redFlags: [],
                    retryQuestion: recovered
                };
            }
            throw new Error('No active question found and recovery failed.');
        }

        // Evaluate answer via AI
        const evaluation = await session.aiQuestioner.evaluateAnswer(answer, session.currentQuestion);

        // Update satisfaction score using moving average-ish approach
        const momentum = 0.25; // Slightly faster shift
        session.satisfactionScore = (session.satisfactionScore * (1 - momentum)) + (evaluation.score * momentum);

        // [NEW] Pressure Meter Adjustment
        if (evaluation.score > 80) session.pressureMeter = Math.min(100, session.pressureMeter + 15);
        else if (evaluation.score < 40) session.pressureMeter = Math.max(0, session.pressureMeter - 10);

        // Record history
        session.questionHistory.push({
            question: session.currentQuestion.text,
            answer,
            score: evaluation.score,
            feedback: evaluation.feedback,
            redFlags: evaluation.redFlags,
            vibe: evaluation.vibe,
            breakdown: evaluation.breakdown,
            shadowNotes: evaluation.shadowNotes
        });

        // Update interviewer's state for the next turn/switch
        if (session.currentInterviewer) {
            session.currentInterviewer.shadowNotes = evaluation.shadowNotes;
        }

        // [NEW] Project Deep-Dive Triggering - Await to ensure injection before next question request
        await this.trackProjectMentions(session, answer).catch(e => console.error("[Interview] Track mentions failed:", e));

        // Track project focus
        if (session.currentQuestion.type === 'PROJECT' && session.currentQuestion.context) {
            session.projectsFocused.add(session.currentQuestion.context);
        }

        // Clear current question after answer is submitted to force a state check
        session.currentQuestion = null;

        return {
            score: evaluation.score,
            feedback: evaluation.feedback,
            satisfaction: Math.round(session.satisfactionScore),
            redFlags: evaluation.redFlags,
            breakdown: evaluation.breakdown,
            vibe: evaluation.vibe,
            shadowNotes: evaluation.shadowNotes
        };
    }

    private async trackProjectMentions(session: InterviewSession, answer: string) {
        const projects = session.context.projects || [];
        for (const project of projects) {
            const name = project.name;
            if (answer.toLowerCase().includes(name.toLowerCase())) {
                const count = (session.projectMentionCount.get(name) || 0) + 1;
                session.projectMentionCount.set(name, count);

                if (count === 2 && !session.activeDeepDive) {
                    console.log(`[Interview] Deep-dive triggered for project: ${name} (Duration: 2 Qs)`);

                    // Set the flag for 2 questions
                    session.activeDeepDive = { projectName: name, questionsRemaining: 2 };

                    // Clear existing normal questions to ensure immediate consecutive deep-dives
                    session.questionQueue = [];

                    // Trigger the first one immediately and unshift
                    const deepDiveQs = await session.aiQuestioner.generateQuestions(session.questionHistory, 1, {
                        mode: 'DEEP_DIVE',
                        targetProject: name
                    });

                    if (deepDiveQs && deepDiveQs.length > 0) {
                        session.questionQueue.push(deepDiveQs[0]);
                        session.activeDeepDive.questionsRemaining--;

                        // Prefetch the second one immediately to fill the queue
                        this.replenishQueue(session).catch(e => console.error("[Interview] Deep-dive prefetch failed:", e));
                    }
                }
            }
        }
    }

    private shouldEndInterview(session: InterviewSession): boolean {
        const count = session.questionHistory.length;

        // Time Limit (12 Minutes)
        const MAX_DURATION = 12 * 60 * 1000;
        const elapsed = Date.now() - new Date(session.startedAt).getTime();

        if (elapsed > MAX_DURATION) {
            console.log(`[Interview] Ending session ${session.id} due to time limit (${elapsed}ms)`);
            return true;
        }

        // Logic based on User Request:
        // 1. Unlimited questions until time runs out OR AI is satisfied.
        // 2. Strict 12-minute time limit.
        // 3. Early exit if candidate proves themselves (Satisfaction > 90).

        // Early termination if VERY satisfied (after min 5 Qs)
        if (count >= 5 && session.satisfactionScore > 90) return true;

        // Early termination if VERY dissatisfied
        if (count >= 5 && session.satisfactionScore < 20) return true;

        return false;
    }

    async getSessionSummary(sessionId: string, username?: string): Promise<any> {
        let session = this.sessions.get(sessionId);
        let historyRecord: InterviewRecord | undefined;

        // Fallback to History Storage if not in memory
        if (!session && username) {
            const storage = new HistoryStorage(username);
            const history = await storage.loadHistory();
            historyRecord = history.find(r => r.id === sessionId);
        }

        if (!session && !historyRecord) return null;

        const score = session ? Math.round(session.satisfactionScore) : (historyRecord?.score || 0);
        const passed = score >= 70;
        const history = session ? session.questionHistory : []; // History storage might not store full Q&A for brevity, but we can enrich if needed
        const improvementPlan = session ? undefined : historyRecord?.improvementPlan;

        return {
            sessionId,
            totalQuestions: session ? session.questionHistory.length : (historyRecord?.questionsAsked || 0),
            finalSatisfaction: score,
            score: score, // [NEW] Alias for frontend
            passed,
            verdict: passed
                ? "HIRE: Candidate demonstrated solid technical depth."
                : "NO HIRE: Candidate failed to defend their resume claims.",
            history: history,
            improvementPlan: session ? undefined : improvementPlan, // Only provide plan on summary
            marketValue: {
                seniority: score > 80 ? "Senior/Lead" : score > 50 ? "Mid-Level" : "Junior",
                marketFit: score > 70 ? "HIGH" : "MODERATE"
            }
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

        // [NEW] Improvement Plan (Async AI call)
        const improvementPlan = await session.aiQuestioner.generateImprovementPlan(session.questionHistory);

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
            weakestSkills: session.questionHistory.filter(q => q.score < 60).map(q => q.question).slice(0, 3), // Better mapping
            improvementPlan
        };

        const storage = new HistoryStorage(session.username);
        await storage.saveRecord(record);

        // [NEW] Multi-Session Intelligence Evolution
        try {
            const allHistory = await storage.loadHistory();
            const intelligence = await session.aiQuestioner.refineCandidateIntelligence(allHistory);
            if (intelligence) {
                const profileRepo = new ProfileRepository();
                await profileRepo.saveCandidateIntelligence(session.username, intelligence);
                console.log(`[Interview] Evolved long-term intelligence for ${session.username} using ${allHistory.length} sessions.`);
            }

            // [FIX] Sync to Growth History for Graphing
            const profileRepo = new ProfileRepository();

            // Calculate average breakdown
            const breakdown = session.questionHistory.reduce((acc, q) => {
                if (q.breakdown) {
                    acc.accuracy += q.breakdown.accuracy || 0;
                    acc.depth += q.breakdown.depth || 0;
                    acc.communication += q.breakdown.communication || 0;
                    acc.count++;
                }
                return acc;
            }, { accuracy: 0, depth: 0, communication: 0, count: 0 });

            const finalBreakdown = breakdown.count > 0 ? {
                accuracy: Math.round(breakdown.accuracy / breakdown.count),
                depth: Math.round(breakdown.depth / breakdown.count),
                communication: Math.round(breakdown.communication / breakdown.count)
            } : { accuracy: 0, depth: 0, communication: 0 };

            await profileRepo.updateGrowthHistory(session.username, 'interview_score', record.score, {
                sessionId: session.id,
                verdict: record.verdict,
                topics: record.skillsTested,
                feedback: record.improvementPlan?.summary || "Interview Completed",
                breakdown: finalBreakdown
            });

        } catch (IQError) {
            console.error("[Interview] Candidate IQ evolution failed:", IQError);
        }

        return record;
    }
}
