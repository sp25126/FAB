/**
 * Static Question Database
 * Pre-seeded questions for interview diversity:
 * - Behavioral: Teamwork, conflict, deadlines, growth
 * - General CS: Algorithms, design patterns, system design
 * - Technical: Framework-specific, language-specific
 */

import { Question } from './rag-questioner';

export const BEHAVIORAL_QUESTIONS: Question[] = [
    {
        text: "Tell me about a time you had to work with a difficult team member. How did you handle it?",
        context: "Behavioral: Teamwork",
        expectedPoints: ["Conflict resolution", "Communication skills", "Professional attitude"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    },
    {
        text: "Describe a situation where you had to meet a tight deadline. What was your approach?",
        context: "Behavioral: Time Management",
        expectedPoints: ["Prioritization", "Time management", "Stress handling"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    },
    {
        text: "Give an example of a time you made a mistake in your code that made it to production. How did you handle it?",
        context: "Behavioral: Accountability",
        expectedPoints: ["Ownership", "Problem solving", "Learning from mistakes"],
        difficulty: "HARD",
        type: "BEHAVIORAL"
    },
    {
        text: "Tell me about a time you had to learn a new technology quickly. How did you approach it?",
        context: "Behavioral: Learning",
        expectedPoints: ["Self-learning ability", "Adaptability", "Resource utilization"],
        difficulty: "EASY",
        type: "BEHAVIORAL"
    },
    {
        text: "Describe a project where you took initiative beyond your assigned responsibilities.",
        context: "Behavioral: Initiative",
        expectedPoints: ["Proactiveness", "Ownership", "Impact"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    },
    {
        text: "How do you handle disagreements with your manager or senior developers about technical decisions?",
        context: "Behavioral: Communication",
        expectedPoints: ["Respectful communication", "Data-driven arguments", "Compromise"],
        difficulty: "HARD",
        type: "BEHAVIORAL"
    },
    {
        text: "Tell me about a time you received critical feedback. How did you respond?",
        context: "Behavioral: Growth Mindset",
        expectedPoints: ["Receptiveness", "Self-improvement", "Professional maturity"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    },
    {
        text: "Describe your approach to code reviews. How do you give constructive feedback?",
        context: "Behavioral: Collaboration",
        expectedPoints: ["Constructive criticism", "Technical communication", "Mentoring"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    },
    {
        text: "What motivates you to keep learning and improving as a developer?",
        context: "Behavioral: Motivation",
        expectedPoints: ["Passion for technology", "Growth mindset", "Career goals"],
        difficulty: "EASY",
        type: "BEHAVIORAL"
    },
    {
        text: "Tell me about a time you had to explain a complex technical concept to a non-technical stakeholder.",
        context: "Behavioral: Communication",
        expectedPoints: ["Simplification", "Analogies", "Patience"],
        difficulty: "MEDIUM",
        type: "BEHAVIORAL"
    }
];

export const GENERAL_CS_QUESTIONS: Question[] = [
    {
        text: "Explain the difference between a stack and a queue. When would you use each?",
        context: "General CS: Data Structures",
        expectedPoints: ["LIFO vs FIFO", "Use cases", "Time complexity"],
        difficulty: "EASY",
        type: "TECHNICAL"
    },
    {
        text: "What is the time complexity of common sorting algorithms? When would you choose one over another?",
        context: "General CS: Algorithms",
        expectedPoints: ["O(n log n) vs O(n²)", "Stability", "Space complexity"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "Explain the concept of Big O notation and why it matters in software development.",
        context: "General CS: Complexity Analysis",
        expectedPoints: ["Asymptotic analysis", "Performance implications", "Practical examples"],
        difficulty: "EASY",
        type: "TECHNICAL"
    },
    {
        text: "What is the difference between SQL and NoSQL databases? When would you choose one over the other?",
        context: "General CS: Databases",
        expectedPoints: ["ACID vs BASE", "Schema flexibility", "Scaling patterns"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "Explain the concept of caching. What are some common caching strategies?",
        context: "General CS: System Design",
        expectedPoints: ["Cache invalidation", "LRU/LFU", "Cache-aside pattern"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What is the CAP theorem? How does it affect distributed system design?",
        context: "General CS: Distributed Systems",
        expectedPoints: ["Consistency, Availability, Partition tolerance", "Trade-offs", "Examples"],
        difficulty: "HARD",
        type: "TECHNICAL"
    },
    {
        text: "Explain the difference between process and thread. What are the trade-offs?",
        context: "General CS: Operating Systems",
        expectedPoints: ["Memory isolation", "Context switching", "Concurrency"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What are design patterns? Explain one pattern you've used in a real project.",
        context: "General CS: Design Patterns",
        expectedPoints: ["Pattern definition", "Real-world application", "Benefits"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "Explain how HTTPS works. What happens when you visit a secure website?",
        context: "General CS: Networking",
        expectedPoints: ["TLS handshake", "Certificate validation", "Encryption"],
        difficulty: "HARD",
        type: "TECHNICAL"
    },
    {
        text: "What is recursion? What are its pros and cons compared to iteration?",
        context: "General CS: Programming Concepts",
        expectedPoints: ["Base case", "Stack overflow", "Tail recursion"],
        difficulty: "EASY",
        type: "TECHNICAL"
    }
];

export const TECHNICAL_FRAMEWORK_QUESTIONS: Question[] = [
    {
        text: "Explain the difference between React's useState and useReducer hooks. When would you use each?",
        context: "Technical: React",
        expectedPoints: ["State complexity", "Performance", "Predictability"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What is the event loop in Node.js? How does it handle asynchronous operations?",
        context: "Technical: Node.js",
        expectedPoints: ["Call stack", "Callback queue", "Non-blocking I/O"],
        difficulty: "HARD",
        type: "TECHNICAL"
    },
    {
        text: "Explain the difference between REST and GraphQL. What are the trade-offs?",
        context: "Technical: APIs",
        expectedPoints: ["Over-fetching", "Type system", "Complexity"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What is Docker? How does containerization differ from virtualization?",
        context: "Technical: DevOps",
        expectedPoints: ["Container isolation", "Image layers", "Resource efficiency"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "Explain the difference between authentication and authorization. How would you implement both?",
        context: "Technical: Security",
        expectedPoints: ["Identity vs permissions", "JWT", "RBAC"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What is TypeScript? What are the benefits of using it over plain JavaScript?",
        context: "Technical: TypeScript",
        expectedPoints: ["Type safety", "IDE support", "Compile-time errors"],
        difficulty: "EASY",
        type: "TECHNICAL"
    },
    {
        text: "Explain the concept of middleware in Express.js. How would you create a custom middleware?",
        context: "Technical: Express",
        expectedPoints: ["Request/response cycle", "next()", "Error handling"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    },
    {
        text: "What is Git branching strategy? Explain Git Flow or your preferred approach.",
        context: "Technical: Git",
        expectedPoints: ["Feature branches", "Release management", "Hotfixes"],
        difficulty: "EASY",
        type: "TECHNICAL"
    },
    {
        text: "Explain database indexing. When should you add an index and what are the trade-offs?",
        context: "Technical: Databases",
        expectedPoints: ["Query performance", "Write overhead", "Index types"],
        difficulty: "HARD",
        type: "TECHNICAL"
    },
    {
        text: "What is CI/CD? How would you set up a deployment pipeline for a web application?",
        context: "Technical: DevOps",
        expectedPoints: ["Continuous integration", "Automated testing", "Deployment strategies"],
        difficulty: "MEDIUM",
        type: "TECHNICAL"
    }
];

/**
 * Get a random subset of questions from each category
 */
export function getRandomQuestions(count: number = 5): Question[] {
    const allQuestions = [...BEHAVIORAL_QUESTIONS, ...GENERAL_CS_QUESTIONS, ...TECHNICAL_FRAMEWORK_QUESTIONS];
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Get questions by type
 */
export function getQuestionsByType(type: 'BEHAVIORAL' | 'TECHNICAL', count: number = 5): Question[] {
    const pool = type === 'BEHAVIORAL' ? BEHAVIORAL_QUESTIONS :
        [...GENERAL_CS_QUESTIONS, ...TECHNICAL_FRAMEWORK_QUESTIONS];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
