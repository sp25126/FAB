import { LLMProvider } from './types';

/**
 * MockProvider - Returns hardcoded responses for testing
 * when no real LLM (Ollama/Remote) is available
 */
export class MockProvider implements LLMProvider {
    public name = 'Mock (Testing Only)';

    async generate(prompt: string, options?: any): Promise<string> {
        console.log('[MockProvider] Generating mock response');

        // Return sensible mock responses based on prompt content
        if (prompt.toLowerCase().includes('question')) {
            return 'Tell me about your experience with the technologies listed on your resume.';
        }

        if (prompt.toLowerCase().includes('evaluate')) {
            return JSON.stringify({
                score: 50,
                feedback: "Mock evaluation - LLM not configured. Please set up Ollama or Remote Brain.",
                redFlags: [],
                breakdown: { accuracy: 50, depth: 50, communication: 50 }
            });
        }

        return 'Mock response - Please configure a real LLM provider (Ollama or Remote) for actual functionality.';
    }

    async generateJSON<T>(prompt: string): Promise<T> {
        console.log('[MockProvider] Generating mock JSON response');

        // Return mock evaluation response
        const mockResponse = {
            score: 50,
            feedback: "Mock mode - Your answer was recorded. Configure Ollama or Remote Brain for real evaluation.",
            redFlags: [],
            breakdown: {
                accuracy: 50,
                depth: 50,
                communication: 50
            },
            pivotRequested: false,
            questions: [
                {
                    text: "Tell me about a challenging project you've worked on.",
                    type: "PROJECT",
                    difficulty: "MEDIUM",
                    expectedPoints: ["problem description", "solution", "outcome"]
                }
            ]
        };

        return mockResponse as T;
    }

    async healthCheck(): Promise<boolean> {
        return true; // Mock is always "healthy"
    }

    async evaluateAnswer(question: string, answer: string, expectedPoints: string[] = [], context: string = ''): Promise<any> {
        return {
            score: 50,
            feedback: "Mock evaluation - LLM not configured.",
            redFlags: [],
            breakdown: { accuracy: 50, depth: 50, communication: 50 },
            satisfaction: 50
        };
    }
}
