import { LLMFactory } from '../llm/factory';
import { Question, InterviewContext } from './types';

export class AIQuestioner {
    private context: InterviewContext;
    private askedQuestions: Set<string> = new Set();
    private brainType: string;

    constructor(context: InterviewContext, brainType: string = 'local') {
        this.context = context;
        this.brainType = brainType;
    }

    async generateQuestions(history: any[] = [], count: number = 1): Promise<Question[]> {
        const provider = LLMFactory.getProviderWithFallback(this.brainType);

        // prioritized project selection
        // 1. Deep projects (with core files)
        // 2. Light projects (descriptions only)

        const questions = [];
        const projects = this.context.projects || [];
        const experience = this.context.experience || [];

        const deepProjects = projects.filter((p: any) => p.coreFiles && p.coreFiles.length > 0);
        const lightProjects = projects.filter((p: any) => !p.coreFiles || p.coreFiles.length === 0);

        // Usage context for the AI
        const contextStr = JSON.stringify({
            skills: this.context.skills ? this.context.skills.slice(0, 15) : [],
            experience_years: experience.length,
            recent_project: projects[0]?.name || "None",
            summary: this.context.summary || "Not provided"
        });

        const memoryStr = this.context.weaknesses && this.context.weaknesses.length > 0
            ? `⚠️ PREVIOUS WEAKNESSES: ${this.context.weaknesses.join(', ')} (Grill them on these!)`
            : "No previous weaknesses recorded.";

        // Format history for the AI
        const historyStr = history.map((h, i) =>
            `Q${i + 1}: ${h.question}\nA: ${h.answer}\nScore: ${h.score}/100\n`
        ).join('\n---\n');

        const prompt = `
            You are a Senior Engineering Manager (10+ years exp) conducting a high-stakes interview.
            Your goal: Assess the candidate's TRUE depth. Detect bullshit. Find their limit.
            
            CANDIDATE CONTEXT:
            ${contextStr}

            LONG TERM MEMORY:
            ${memoryStr}

            INTERVIEW HISTORY:
            ${historyStr || "No questions asked yet. This is the start."}

            INSTRUCTIONS:
            1. Review the HISTORY. 
            2. If the last answer was weak (< 60), DRILL DOWN. Ask "Why?" or "Explain X in more detail".
            3. If the last answer was strong (> 80) but suspicious, CHALLENGE them.
            4. If the topic is exhausted, SWITCH to a new project or skill from their context.
            5. Enforce STAR method for behavioral questions.
            6. Ask SYSTEM DESIGN questions if they claim architectural skills.

            DECISION PROCESS (Chain of Thought):
            - Analyze last interaction.
            - Identify missing signal (e.g., "They mentioned scaling but didn't say how").
            - Formulate the next question to get that signal.

            OUTPUT FORMAT (JSON Array):
            [
                {
                    "text": "The actual question...",
                    "type": "TECHNICAL" | "BEHAVIORAL" | "SYSTEM_DESIGN" | "PROJECT",
                    "difficulty": "HARD",
                    "context": "Reasoning for asking this (e.g., Follow-up on caching)",
                    "expectedPoints": ["point 1", "point 2"]
                }
            ]
        `;

        try {
            // Using getProviderWithFallback is async, but here we called it as static?
            // Wait, getProviderWithFallback is static async.
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);

            let questions = await robustProvider.generateJSON<Question[]>(prompt);

            // Robustness: Handle if LLM returns single object instead of array
            if (!Array.isArray(questions)) {
                // @ts-ignore
                questions = [questions];
            }

            if (!questions || questions.length === 0) {
                throw new Error("Empty question list returned");
            }

            // Filter duplicates
            return questions.filter(q => {
                if (!q || !q.text) return false;
                const isNew = !this.askedQuestions.has(q.text);
                if (isNew) this.askedQuestions.add(q.text);
                return isNew;
            });

        } catch (error) {
            console.error("AI Question Generation Failed:", error);
            // Fallback question
            return [{
                text: "Let's pivot. Tell me about a technical trade-off you made in your most recent project.",
                type: "PROJECT",
                difficulty: "MEDIUM",
                context: "Fallback due to error",
                expectedPoints: ["Problem", "Options", "Decision", "Consequence"]
            }];
        }
    }

    async evaluateAnswer(answer: string, question: Question): Promise<any> {
        try {
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);
            return await robustProvider.evaluateAnswer(question.text, answer, question.expectedPoints, question.context);
        } catch (error) {
            console.error("AI Answer Evaluation Failed:", error);
            return {
                score: 50,
                feedback: "System error during evaluation. Proceeding...",
                satisfaction: 50,
                redFlags: [],
                breakdown: { accuracy: 50, depth: 50, communication: 50 }
            };
        }
    }

    async generateProjectSpec(weakSkills: string[], currentSkills: string[]): Promise<any> {
        const prompt = `
            You are a Senior Engineering Manager acting as a Career Coach.
            The candidate has the following SKILL GAPS: ${weakSkills.join(', ')}.
            They already know: ${currentSkills.join(', ')}.
            
            DESIGN A PROJECT to help them bridge these gaps.
            The project should be challenging but achievable.
            
            OUTPUT JSON ONLY:
            {
                "title": "Project Name",
                "description": "High-level summary",
                "techStack": ["Tool 1", "Tool 2"],
                "features": ["Core Feature 1", "Core Feature 2"],
                "learningGoals": ["What they will master"]
            }
        `;

        try {
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);
            return await robustProvider.generateJSON(prompt);
        } catch (error) {
            console.error("AI Project Spec Generation Failed:", error);
            return {
                title: "Build a Full-Stack App",
                description: "Create a CRUD application to practice your weak skills.",
                techStack: [...weakSkills, ...currentSkills],
                features: ["User Auth", "Database Integration"],
                learningGoals: ["Master the basics"]
            };
        }
    }
}
