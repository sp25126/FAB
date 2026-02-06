
import { ScrapedQuestion } from './scraper';

// Simple in-memory vector store simulation since setting up ChromaDB requires more dependencies
// Ideally we would use 'chromadb' or 'lancedb' package here
// For now, we will use TF-IDF style keyword matching which is sufficient for this stage
// without adding heavy ML dependencies to the backend

interface VectorEntry {
    id: string;
    text: string;
    metadata: ScrapedQuestion;
    vector?: number[]; // Placeholder for real embedding
}

export class QuestionVectorDB {
    private db: VectorEntry[] = [];

    constructor() {
        // Initialize
    }

    async storeQuestions(questions: ScrapedQuestion[]): Promise<void> {
        console.log(`[VectorDB] Storing ${questions.length} questions...`);
        for (const q of questions) {
            // Avoid duplicates
            if (!this.db.find(e => e.text === q.question)) {
                this.db.push({
                    id: Math.random().toString(36).substring(7),
                    text: q.question,
                    metadata: q
                });
            }
        }
    }

    async searchRelevant(
        skills: string[],
        projectContext: string,
        limit: number = 10,
        filters?: { techStack?: string[]; language?: string; }
    ): Promise<ScrapedQuestion[]> {
        console.log(`[VectorDB] Searching relevant questions for skills: ${skills.slice(0, 3).join(', ')}...`);

        const results = this.db.map(entry => {
            let score = 0;
            const qText = entry.text.toLowerCase();
            const meta = entry.metadata;

            // Metadata Filters (Exclusion)
            if (filters) {
                if (filters.language && meta.language && meta.language.toLowerCase() !== filters.language.toLowerCase()) {
                    return { entry, score: -1 };
                }
                if (filters.techStack && meta.techStack) {
                    const hasIntersection = filters.techStack.some(t =>
                        meta.techStack?.some(mt => mt.toLowerCase() === t.toLowerCase())
                    );
                    if (!hasIntersection) return { entry, score: -1 };
                }
            }

            // Skill match
            skills.forEach(skill => {
                if (qText.includes(skill.toLowerCase())) score += 5;
                if (meta.topic.toLowerCase().includes(skill.toLowerCase())) score += 3;
            });

            // Project context match
            if (projectContext) {
                const projectKeywords = projectContext.toLowerCase().split(' ').filter(w => w.length > 5);
                projectKeywords.forEach(word => {
                    if (qText.includes(word)) score += 2;
                });
            }

            // Categorization bonus
            if (filters?.language && meta.language?.toLowerCase() === filters.language.toLowerCase()) score += 10;

            return { entry, score };
        });

        return results
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(r => r.entry.metadata);
    }

    async getAllQuestions(): Promise<ScrapedQuestion[]> {
        return this.db.map(e => e.metadata);
    }
}
