import { QuestionTemplate, QUESTION_DATABASE } from './questions-db';

export interface InterviewSession {
    id: string;
    skills: string[];
    questions: QuestionTemplate[];
    answers: Record<number, string>;
    timestamp: string;
}

export class InterviewManager {
    /**
     * Generates a tailored set of questions based on a list of skills.
     * Aim: 5 questions total (2 Easy, 2 Medium, 1 Hard)
     */
    static generateInterview(skills: string[]): QuestionTemplate[] {
        const interviewQuestions: QuestionTemplate[] = [];
        const normalizedSkills = skills.map(s => s.toLowerCase());

        // 1. Filter database for relevant skills
        const availableQuestions = QUESTION_DATABASE.filter(q =>
            normalizedSkills.includes(q.skill)
        );

        if (availableQuestions.length === 0) {
            // Fallback: Pick general software engineering questions if no specific skills match
            // For now, let's just pick from whatever we have if it's a small pool
            return this.getRandomSet(QUESTION_DATABASE, 5);
        }

        // 2. Group by difficulty
        const easy = availableQuestions.filter(q => q.difficulty === 'easy');
        const medium = availableQuestions.filter(q => q.difficulty === 'medium');
        const hard = availableQuestions.filter(q => q.difficulty === 'hard');

        // 3. Selection Strategy: 2 Easy, 2 Medium, 1 Hard
        interviewQuestions.push(...this.getRandomSet(easy, 2));
        interviewQuestions.push(...this.getRandomSet(medium, 2));
        interviewQuestions.push(...this.getRandomSet(hard, 1));

        // 4. If we don't have enough, fill with random available ones
        if (interviewQuestions.length < 5) {
            const currentIds = new Set(interviewQuestions.map(q => q.question));
            const remaining = availableQuestions.filter(q => !currentIds.has(q.question));
            interviewQuestions.push(...this.getRandomSet(remaining, 5 - interviewQuestions.length));
        }

        return interviewQuestions;
    }

    private static getRandomSet<T>(arr: T[], count: number): T[] {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}
