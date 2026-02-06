
import { LLMFactory, BrainType } from '../llm/factory';
import { OllamaProvider } from '../llm/ollama';
import { QuestionVectorDB } from './vector-db';
import { QuestionScraper } from './scraper';

export interface Question {
    text: string;
    context: string;
    expectedPoints: string[];
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    source?: string;
    type: 'TECHNICAL' | 'PROJECT' | 'BEHAVIORAL';
}

export interface CandidateContext {
    skills: string[];
    experience: any[];
    projects: any[];
    githubStats?: any;
}

export class RAGQuestioner {
    private context: CandidateContext;
    private vectorDB: QuestionVectorDB;
    private scraper: QuestionScraper;
    private askedQuestions: Set<string> = new Set();
    private projectStrikes: Map<string, number> = new Map();
    private brainType: BrainType;

    constructor(context: CandidateContext, brainType: BrainType = 'local') {
        this.context = context;
        this.brainType = brainType;
        this.vectorDB = new QuestionVectorDB();
        this.scraper = new QuestionScraper();
    }

    async initialize(): Promise<void> {
        // 100% Non-blocking: We start the process and return immediately.
        // The background process handles AI seeding and Scraper expansion.
        (async () => {
            try {
                const skillsToScrape = this.context.skills;
                const projectTech = new Set<string>();
                this.context.projects.forEach((p: any) => {
                    if (p.techStack && Array.isArray(p.techStack)) {
                        p.techStack.forEach((t: string) => projectTech.add(t));
                    }
                    if (p.language) projectTech.add(p.language);
                });

                const allTopics = Array.from(new Set([...skillsToScrape, ...Array.from(projectTech)]));

                // 1. Instant AI Seed Generation (Low priority background)
                const provider = LLMFactory.getProvider(this.brainType);

                // 2. Background Scraping Batching (Staggered to prevent connection strain)
                const batches: string[][] = [];
                for (let i = 0; i < allTopics.length; i += 2) {
                    batches.push(allTopics.slice(i, i + 2));
                }

                // Start scraping slowly after a 5s delay to let the session start fully
                setTimeout(async () => {
                    for (const batch of batches) {
                        await Promise.allSettled(batch.map(async (topic) => {
                            try {
                                const questions = await this.scraper.scrapeQuestions(topic);
                                if (questions.length > 0) {
                                    await this.vectorDB.storeQuestions(questions);
                                }
                            } catch (e) {
                                // Silent failure for background scraper
                            }
                        }));
                        await new Promise(r => setTimeout(r, 5000)); // Large gap between batches
                    }
                }, 5000);

            } catch (error) {
                console.error("[RAG] Background initialization failed", error);
            }
        })().catch(e => console.error("[RAG] Fatal background error", e));

        console.log("[RAG] Initialization triggered (Non-blocking)");
    }

    async generateQuestions(count: number = 3): Promise<Question[]> {
        const prompt = this.buildGenerationPrompt(count);
        const questions: Question[] = [];

        // 1. Get RAG suggestions (Industrial Standards)
        const techStack = this.context.skills.slice(0, 5);
        const language = this.context.projects[0]?.language || 'javascript';
        const ragSuggestions = (await this.vectorDB.searchRelevant(
            this.context.skills,
            JSON.stringify(this.context.projects.slice(0, 2)),
            10,
            { techStack, language }
        )).filter(s => !this.askedQuestions.has(s.question));

        // 2. Hybrid Pool Construction
        const provider = LLMFactory.getProvider(this.brainType);

        try {
            console.log(`[RAG] Generating Hybrid AI questions (Count: ${count})...`);
            // Use generateJSON for robust parsing
            const parsed = await provider.generateJSON<any[]>(prompt);

            if (Array.isArray(parsed)) {
                parsed.forEach((q: any) => {
                    const finalQ: Question = {
                        text: q.question || q.text,
                        context: q.context || "Hybrid Context",
                        expectedPoints: q.expectedPoints || [],
                        difficulty: q.difficulty || 'MEDIUM',
                        source: 'Hybrid-AI',
                        type: q.type || 'TECHNICAL'
                    };

                    if (finalQ.text && !this.askedQuestions.has(finalQ.text)) {
                        questions.push(finalQ);
                        this.askedQuestions.add(finalQ.text);
                    }
                });
            }
        } catch (e) {
            console.error("[RAG] AI Hybrid generation failed", e);
        }

        // 3. Robust Fallback (Safety Seeds)
        // If AI fails AND RAG is empty (not yet scraped), we MUST provide something
        if (questions.length < count) {
            console.log("[RAG] AI pool empty, using Safety Seeds...");
            const safetySeeds: Question[] = [
                { text: `Based on your experience with ${this.context.skills[0] || 'software development'}, what was the most challenging bug you solved?`, type: 'TECHNICAL', context: 'SafetyFallback', expectedPoints: ['Problem solving', 'Technical depth'], difficulty: 'MEDIUM' },
                { text: "Can you explain the architecture of one of your recent projects in detail?", type: 'PROJECT', context: 'SafetyFallback', expectedPoints: ['System design', 'Ownership'], difficulty: 'MEDIUM' },
                { text: "How do you ensure code quality and maintainability in a teams environment?", type: 'BEHAVIORAL', context: 'SafetyFallback', expectedPoints: ['Testing', 'Code reviews'], difficulty: 'MEDIUM' }
            ];

            for (const q of safetySeeds) {
                if (!this.askedQuestions.has(q.text) && questions.length < count) {
                    questions.push(q);
                    this.askedQuestions.add(q.text);
                }
            }
        }

        // 4. Augmentation from RAG Pool (Web scraped)
        if (questions.length < count && ragSuggestions.length > 0) {
            const needed = count - questions.length;
            const selected = ragSuggestions.slice(0, needed);

            selected.forEach(r => {
                const finalQ: Question = {
                    text: r.question,
                    context: r.topic,
                    expectedPoints: ['See industry best practices'],
                    difficulty: 'MEDIUM' as const,
                    source: `RAG-${r.source}`,
                    type: (r.question.toLowerCase().includes('project') || r.question.toLowerCase().includes('experience')) ? 'PROJECT' : 'TECHNICAL' as const
                };
                if (!this.askedQuestions.has(finalQ.text)) {
                    questions.push(finalQ);
                    this.askedQuestions.add(finalQ.text);
                }
            });
        }

        return questions;
    }

    async getFollowUp(prevAnswer: string, prevQuestion: string): Promise<Question | null> {
        // Simple logic: if answer is short, probe deeper
        if (prevAnswer.length < 50) {
            return {
                text: `Can you elaborate on that? Specifically regarding ${prevQuestion.split(' ').slice(-3).join(' ')}?`,
                context: "Follow-up",
                expectedPoints: ["More detail"],
                difficulty: "MEDIUM",
                type: 'TECHNICAL'
            };
        }
        return null;
    }

    async evaluateAnswer(answer: string, question: Question): Promise<{
        score: number;
        feedback: string;
        redFlags: string[];
    }> {
        const prompt = `
            You are a senior technical interviewer. You are UNRELENTING, CRITICAL, but FAIR.
            Evaluate the following candidate response to the given question.
            
            QUESTION: ${question.text}
            EXPECTED POINTS: ${question.expectedPoints.join(', ')}
            CANDIDATE ANSWER: "${answer}"
            
            SCORING CRITERIA:
            1. TECHNICAL ACCURACY (40%): Is the core concept correct?
            2. DEPTH (40%): Did they explain the 'why' or 'how', or just surface-level? 
            3. CLARITY & COMMUNICATION (20%): Is the answer professional and well-structured?

            CRITICAL GUIDELINES:
            - If introductory ("Tell me about yourself"), baseline 50 if they mention name/tech, higher if they mention specific achievements.
            - If it's a project deep dive and they don't know THEIR OWN CODE structure, score < 20.
            - If the answer is gibberish, score 0.
            
            Return JSON ONLY:
            {
                "score": 0-100,
                "breakdown": {
                    "accuracy": 0-100,
                    "depth": 0-100,
                    "communication": 0-100
                },
                "feedback": "Concise, brutally honest feedback including what was missing.",
                "redFlags": [],
                "pivotRequested": true/false
            }
        `;

        try {
            const provider = LLMFactory.getProvider(this.brainType);
            const response = await provider.generateJSON<any>(prompt);

            // Detect pivot request or "I don't know"
            const lowerAnswer = answer.toLowerCase();
            const isNonAnswer = response.pivotRequested ||
                lowerAnswer.includes("don't know") ||
                lowerAnswer.includes("dont know") ||
                lowerAnswer.includes("no idea") ||
                lowerAnswer.includes("select other project") ||
                lowerAnswer.length < 5;

            if (isNonAnswer && question.context.startsWith("Project: ")) {
                const projectName = question.context.replace("Project: ", "").trim();
                const strikes = (this.projectStrikes.get(projectName) || 0) + 1;
                this.projectStrikes.set(projectName, strikes);
                console.log(`[RAG] Project ${projectName} Strike ${strikes}`);
            }

            return {
                score: response.score ?? 0,
                feedback: response.feedback ?? "Inconclusive response.",
                redFlags: response.redFlags ?? []
            };
        } catch (e) {
            console.error("Failed to evaluate answer via LLM", e);
            return {
                score: 0,
                feedback: "Failed to process answer. Assuming incompetence.",
                redFlags: ["System processing failure"]
            };
        }
    }

    private buildGenerationPrompt(count: number): string {
        const skillsCount = this.context.skills.length;
        const skills = this.context.skills.slice(0, 15).join(', ');
        const projects = this.context.projects
            .filter((p: any) => (this.projectStrikes.get(p.name) || 0) < 2) // Filter projects with 2+ strikes
            .map((p: any) =>
                `PROJECT: ${p.name}
             Strikes: ${this.projectStrikes.get(p.name) || 0}/2
             Structure: ${p.architecture || 'Monolith/Script'}
             Tech Stack: ${p.techStack ? p.techStack.join(', ') : 'Unknown'}
             Complexity: ${p.complexity || 'Unknown'}
             Summary: ${p.description || 'No description'}
             Key Files: ${p.files ? p.files.join(', ') : 'Unknown'}`)
            .join('\n\n');

        return `
            You are a lead technical interviewer conducting a deep-dive interview.
            Generate ${count} challenge questions for the candidate based on their background.

            CANDIDATE PROFILE:
            Resume Skills (${skillsCount}): ${skills}
            Parsed GitHub Projects:
            ${projects}

            CATEGORIES TO COVER:
            1. PROJECT DEEP DIVE: Ask about specific architectural choices, file structures, or technical challenges discovered in their repos.
            2. TECHNICAL RIGOR: Ask challenging questions about their top skills (e.g. Node.js concurrency, TypeScript generics, etc).
            3. BEHAVIORAL/ENGINEERING CULTURE: Ask how they handle collaboration, code reviews, or complex debugging in their projects.

            RULES:
            - RANDOMIZATION: Each question MUST focus on a DIFFERENT project from the list below if possible.
            - ROTATION: If a project has 1 strike, be CAUTIOUS. If a project is MISSING from the list below (due to 2 strikes), NEVER ask about it again.
            - SPECIFICITY: Mention the project name and reference specific files, architectures (e.g., MVC, Monolith), or tech stack found in analysis.
            - DEPTH: Ask "why" or "how" questions (e.g., "Why did you use Docker in project X instead of just a local script?").
            - CHALLENGING: Avoid definitions. Focus on trade-offs and implementation challenges.
            
            Return JSON Array ONLY:
            [
                {
                    "question": "In your [Project X] repository, I saw you used [Tech Y] in [File Z]. Why did you choose this implementation over [Alternative]?",
                    "type": "PROJECT | TECHNICAL | BEHAVIORAL",
                    "context": "Project: [Project X]",
                    "expectedPoints": ["Understanding of [Tech Y]", "[Alternative] trade-offs"],
                    "difficulty": "HARD"
                }
            ]
        `;
    }
}
