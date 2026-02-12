import { Question } from './types';
import { BEHAVIORAL_QUESTIONS, GENERAL_CS_QUESTIONS, TECHNICAL_FRAMEWORK_QUESTIONS } from './questions-db';

export interface InterviewSession {
    id: string;
    skills: string[];
    questions: Question[];
    answers: Record<number, string>;
    timestamp: string;
}

export class InterviewManager {
    /**
     * Generates a tailored set of questions based on a list of skills.
     * Aim: 5 questions total (2 Easy, 2 Medium, 1 Hard)
     */
    static generateInterview(skills: string[]): Question[] {
        const allQuestions = [...BEHAVIORAL_QUESTIONS, ...GENERAL_CS_QUESTIONS, ...TECHNICAL_FRAMEWORK_QUESTIONS];
        const interviewQuestions: Question[] = [];
        const normalizedSkills = skills.map((s: string) => s.toLowerCase());

        // 1. Filter database for relevant skills
        const availableQuestions = allQuestions.filter((q: Question) =>
            q.context ? normalizedSkills.some((sk: string) => q.context!.toLowerCase().includes(sk)) : false
        );

        if (availableQuestions.length === 0) {
            return this.getRandomSet(allQuestions, 5);
        }

        // 2. Group by difficulty
        const easy = availableQuestions.filter((q: Question) => q.difficulty === 'EASY');
        const medium = availableQuestions.filter((q: Question) => q.difficulty === 'MEDIUM');
        const hard = availableQuestions.filter((q: Question) => q.difficulty === 'HARD');

        // 3. Selection Strategy: 2 Easy, 2 Medium, 1 Hard
        interviewQuestions.push(...this.getRandomSet(easy, 2));
        interviewQuestions.push(...this.getRandomSet(medium, 2));
        interviewQuestions.push(...this.getRandomSet(hard, 1));

        // 4. If we don't have enough, fill with random available ones
        if (interviewQuestions.length < 5) {
            const currentTexts = new Set(interviewQuestions.map((q: Question) => q.text));
            const remaining = availableQuestions.filter((q: Question) => !currentTexts.has(q.text));
            interviewQuestions.push(...this.getRandomSet(remaining, 5 - interviewQuestions.length));
        }

        return interviewQuestions;
    }

    private static getRandomSet<T>(arr: T[], count: number): T[] {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}
