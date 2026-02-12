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

    async generateQuestions(history: any[] = [], count: number = 1, options?: { mode?: 'DEEP_DIVE', targetProject?: string }): Promise<Question[]> {
        const provider = LLMFactory.getProviderWithFallback(this.brainType);

        // prioritized project selection
        // 1. Deep projects (with core files)
        // 2. Light projects (descriptions only)

        const questions = [];
        const projects = this.context.projects || [];
        const experience = this.context.experience || [];

        const deepProjects = projects.filter((p: any) => p.coreFiles && p.coreFiles.length > 0);
        const lightProjects = projects.filter((p: any) => !p.coreFiles || p.coreFiles.length === 0);

        // Usage context for the AI - MUCH RICHER NOW
        const contextStr = JSON.stringify({
            summary: this.context.summary || "Not provided",
            skills: this.context.skills || [],
            experience: this.context.resumeData?.experience || this.context.experience || [],
            projects: (this.context.projects || []).map((p: any) => ({
                name: p.name,
                description: p.description,
                techStack: p.techStack,
                architecture: p.architecture,
                complexity: p.complexity,
                criticalComponents: p.coreFiles?.map((f: any) => f.path) || []
            })),
            resumeProjects: this.context.resumeData?.projects || [],
            growthHistory: this.context.growthHistory || []
        });

        const memoryStr = this.context.weaknesses && this.context.weaknesses.length > 0
            ? `⚠️ RECORDED WEAKNESSES: ${this.context.weaknesses.join(', ')}`
            : "No specific weaknesses recorded yet.";

        // Format history for the AI
        const historyStr = history.map((h, i) =>
            `Q${i + 1}: ${h.question}\nA: ${h.answer}\nScore: ${h.score}/100\nFeedback: ${h.feedback}`
        ).join('\n---\n');

        const interviewerPanel = [
            { name: "FAB Manager", role: "Senior Engineering Manager", tone: "Brutally Honest", shadowNotes: "" },
            { name: "FAB Architect", role: "Principal Architect", tone: "Nitpicky & Deep", shadowNotes: "" },
            { name: "FAB Product", role: "Product Director", tone: "Business-Critical & Trade-offs", shadowNotes: "" },
            { name: "FAB Operations", role: "DevOps Lead", tone: "Reliability & Scale Focused", shadowNotes: "" }
        ];

        // @ts-ignore
        const currentInterviewer = this.context.currentInterviewer || interviewerPanel[0];
        // @ts-ignore
        const pressureMeter = this.context.pressureMeter || 0;
        // @ts-ignore
        const techTrends = this.context.techTrends || [
            "Agentic AI Workflows", "RAG Optimization", "Serverless GPUs",
            "Wasm at Edge", "Bun & Htmx", "Kubernetes Gateway API",
            "Rust-based Toolchains", "Prompt Engineering Automation"
        ];

        const prompt = `
            ROLE: You are ${currentInterviewer.name}, ${currentInterviewer.role}.
            PERSONA: ${currentInterviewer.tone}. Brutally Honest, Direct. No sugar-coating.
            PRESSURE LEVEL: ${pressureMeter}/100 (If > 60, be exceptionally challenging and less patient).
            
            ${options?.mode === 'DEEP_DIVE' ? `
            🚨 SPECIAL MODE: DEEP_DIVE on Project "${options.targetProject}"
            The candidate keeps mentioning this project. STOP everything else. 
            Drill into the architecture, the failures, and the complex choices of "${options.targetProject}".
            Be extremely nitpicky and technical. Look for the limits of their knowledge on this specific project.
            ` : ""}
            
            CANDIDATE INTELLIGENCE (LONG TERM MEMORY):
            ${JSON.stringify(this.context.candidateIntelligence || { notes: "No prior data." })}

            CANDIDATE COMPREHENSIVE CONTEXT:
            ${contextStr}

            GROWTH & WEAKNESS MEMORY:
            ${memoryStr}

            CURRENT INTERVIEW HISTORY:
            ${historyStr || "Just started."}

            MARKET INTELLIGENCE (LATEST TECH TRENDS 2024-2025):
            ${techTrends.join(', ')}
            (Incorporate these into your questions to test if the candidate is up-to-date).
            
            INTERNAL COLLABORATION (REASONING FROM PREVIOUS INTERVIEWER):
            ${currentInterviewer.shadowNotes || "No previous notes. Start fresh."}

            BRUTAL MODE INSTRUCTIONS:
            1. BE SPECIFIC: Don't ask generic questions. Ask about "Line 42 of Project X" or "The specific trade-off between Redis and Memcached in your 2022 role".
            2. GRILL ON GAPS: Look at 'growthHistory' (specifically resume_gap_analysis). If there's a gap in "System Design", dig into it.
            3. CROSS-REFERENCE: If they claim a skill in their Resume but their GitHub Projects don't show it, challenge them.
            4. CYCLE CATEGORIES:
               - PAST EXPERIENCE: Drill into resume roles. "You said you scaled X, how exactly?"
               - PROJECTS/ARCHITECTURE: "Why this specific architecture?" "What happens if Y fails?"
               - CODE-LEVEL: Challenge implementation choices. 
               - CRITICAL THINKING: "If you had half the budget and double the traffic, what do you cut?"
               - BEHAVIORAL: No fluffy answers. Use STAR, but look for ownership and ego.
               - REAL-LIFE: "It's 2 AM, the site is down, and your lead is on vacation. What's your first command?"
            5. NO HOLDING BACK: If an answer is shallow, say so in the 'context' and double down.
            6. STRICT REPETITION BAN: Do not ask any question that is semantically similar to one already asked in the HISTORY.
            7. PROJECT FIRST: 80% of your energy should be on "PROJECT" and "CODE_CHALLENGE" (related to their specific projects) and "PAST EXPERIENCE". Verify their claims.
            
            OUTPUT FORMAT (JSON Array):
            [
                {
                    "text": "The direct question...",
                    "type": "TECHNICAL" | "BEHAVIORAL" | "SYSTEM_DESIGN" | "PROJECT" | "CODE_CHALLENGE",
                    "difficulty": "HARD",
                    "context": "Internal reasoning: Why you are grilling them on this specific point.",
                    "expectedPoints": ["Subtle technical detail 1", "Real-world trade-off 2"],
                    "interviewerIdentity": {
                        "name": "string",
                        "role": "string",
                        "tone": "Aggressive | Neutral | Supportive | Nitpicky"
                    },
                    "shadowNotes": "Your internal, hidden notes about the candidate's performance so far."
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

            // Filter duplicates with normalization
            const normalize = (t: string) => t.toLowerCase().trim().replace(/[?.!,]$/, '');
            const filtered = questions.filter(q => {
                if (!q || !q.text) return false;
                const normalizedText = normalize(q.text);
                const isNew = !this.askedQuestions.has(normalizedText);
                if (isNew) this.askedQuestions.add(normalizedText);
                return isNew;
            });

            if (filtered.length === 0) {
                // All were duplicates! Return a simple backup to keep flow alive.
                const randomSkill = this.context.skills?.[Math.floor(Math.random() * (this.context.skills?.length || 1))] || 'software development';
                const backupQuestion = {
                    text: `Regarding your work with ${randomSkill}, can you describe a specific technical challenge where you had to make a significant trade-off?`,
                    type: "PROJECT" as const,
                    difficulty: "MEDIUM",
                    context: "Randomized fallback due to duplicate avoidance",
                    expectedPoints: ["Trade-off", "Technical reasoning", "Outcome"]
                };
                // Ensure backup is not also duplicate (though unlikely if we rotate, but let's just append timestamp if needed or accept it once)
                // Or just return it.
                return [backupQuestion as any];
            }

            return filtered;

        } catch (error) {
            console.error("AI Question Generation Failed:", error);
            throw error;
        }
    }

    async evaluateAnswer(answer: string, question: Question): Promise<any> {
        // [NEW] Persona Injection for Evaluation
        const evaluationPrompt = `
            As a Senior Engineering Manager, evaluate this candidate's answer.
            BE BRUTALLY HONEST. If they are fluffing, give a low score. If they are technically incorrect, point it out sharply.
            
            QUESTION: ${question.text}
            EXPECTED: ${question.expectedPoints.join(', ')}
            CANDIDATE ANSWER: ${answer}

            Evaluate on:
            1. Accuracy (Technical correctness)
            2. Depth (Do they know the internal mechanics?)
            3. Professionalism (Communication clarity)
            
            Return JSON:
            {
                "score": 0-100,
                "feedback": "Direct, professional, honest feedback.",
                "redFlags": ["Bullshitting", "Conceptual error", etc],
                "satisfaction": 0-100 (Your confidence in them),
                "breakdown": { "accuracy": 0-100, "depth": 0-100, "communication": 0-100 },
                "vibe": { "clarity": 0-100, "confidence": 0-100, "brevity": 0-100 },
                "shadowNotes": "Hidden notes for the next interviewer or the final dossier."
            }
        `;

        try {
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);
            return await robustProvider.generateJSON(evaluationPrompt);
        } catch (error) {
            console.error("AI Answer Evaluation Failed (Primary):", error);

            try {
                // [NEW] Retry with Local Brain explicitly
                const localProvider = new (require('../llm/ollama').OllamaProvider)();
                return await localProvider.evaluateAnswer(question.text, answer, question.expectedPoints, question.context);
            } catch (localError) {
                console.error("AI Evaluation Failed (Local):", localError);
                throw new Error("❌ AI Evaluation Failed. No fallback allowed.");
                /*
                return {
                    score: 50,
                    feedback: "System error during evaluation. Proceeding...",
                    satisfaction: 50,
                    redFlags: [],
                    breakdown: { accuracy: 50, depth: 50, communication: 50 }
                };
                */
            }
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
            console.error("AI Project Spec Generation Failed (Primary):", error);

            try {
                // [NEW] Retry with Local Brain explicitly
                const localProvider = new (require('../llm/ollama').OllamaProvider)();
                return await localProvider.generateJSON(prompt);
            } catch (localError) {
                console.error("AI Project Spec Generation Failed (Local):", localError);
                throw new Error("❌ AI Project Spec Generation Failed. No fallback allowed.");
                /*
                return {
                    title: "Build a Full-Stack App",
                    description: "Create a CRUD application to practice your weak skills.",
                    techStack: [...weakSkills, ...currentSkills],
                    features: ["User Auth", "Database Integration"],
                    learningGoals: ["Master the basics"]
                };
                */
            }
        }
    }

    async refineCandidateIntelligence(history: any[]): Promise<any> {
        const prompt = `
            As a Senior Engineering Manager, analyze this complete interview history.
            Distill your long-term "Candidate Intelligence" for this user.
            
            HISTORY:
            ${JSON.stringify(history)}
            
            Output JSON only:
            {
                "strengths": ["string"],
                "weaknesses": ["string"],
                "communicationStyle": "Direct | Fluffy | Aggressive | Technical",
                "egoLevel": "Low | Medium | High",
                "ownership": "Low | Medium | High",
                "technicalDepth": "Level 1-10",
                "suggestedPersonaForNextTime": "Role/Tone",
                "longTermNotes": "Notes for your future self about this candidate."
            }
        `;

        try {
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);
            return await robustProvider.generateJSON(prompt);
        } catch (error) {
            console.error("Failed to refine candidate intelligence:", error);
            return null;
        }
    }

    async generateImprovementPlan(history: any[]): Promise<any> {
        const poorAnswers = history.filter(h => h.score < 70);
        if (poorAnswers.length === 0) return { message: "Overall excellent performance! No major gaps identified." };

        const prompt = `
            As a Senior Engineering Manager, review these POOR answers from an interview.
            For each question, provide:
            1. Why it was weak.
            2. "The Better Way": A sample strong response or key technical points to include.
            
            POOR ANSWERS:
            ${JSON.stringify(poorAnswers)}
            
            Return JSON:
            {
                "overallAdvice": "Main theme for improvement",
                "questionBreakdown": [
                    {
                        "question": "string",
                        "weakness": "string",
                        "theBetterWay": "string"
                    }
                ]
            }
        `;

        try {
            const robustProvider = await LLMFactory.getProviderWithFallback(this.brainType);
            return await robustProvider.generateJSON(prompt);
        } catch (error) {
            console.error("Failed to generate improvement plan:", error);
            return { error: "Failed to generate detailed feedback." };
        }
    }
}
