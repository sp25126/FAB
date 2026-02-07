import axios from 'axios';
import { LLMProvider } from './types';

export class OllamaProvider implements LLMProvider {
    public name = 'Ollama (Local)';
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'gemma:2b') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async generate(prompt: string, options?: any): Promise<string> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                options: options
            });
            return (response.data as any).response;
        } catch (error: any) {
            console.error('Ollama Generate Error:', error.message);
            throw new Error('Failed to generate response from Ollama');
        }
    }

    async generateJSON<T>(prompt: string): Promise<T> {
        // Enforce JSON format in prompt if model doesn't support json mode natively well
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanations.`;

        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: jsonPrompt,
                format: 'json', // Ollama supports this
                stream: false
            });

            const content = (response.data as any).response;
            return JSON.parse(content) as T;
        } catch (error: any) {
            console.error('Ollama JSON Error:', error.message);
            throw new Error('Failed to generate JSON from Ollama');
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/api/tags`);
            return true;
        } catch (error) {
            return false;
        }
    }

    async evaluateAnswer(question: string, answer: string, expectedPoints: string[] = [], context: string = ''): Promise<any> {
        const prompt = `
        You are a Senior Engineering Manager (10+ years exp). Be BRUTALLY HONEST. Do not sugarcoat. If the answer is vague, destroy it. If it's wrong, say it's wrong.
        
        Question: ${question}
        context: ${context}
        Expected Points: ${expectedPoints.join(', ')}
        Candidate Answer: "${answer}"
        
        Evalute based on:
        1. Accuracy (0-100)
        2. Depth (0-100) - Did they go deep or just surface level?
        3. Communication (0-100) - Was it clear and concise?
        
        Return JSON ONLY:
        {
            "score": 0-100,
            "feedback": "Short, brutal, constructive feedback. Point out exactly what was missing.",
            "redFlags": ["flag1", "flag2"],
            "breakdown": { "accuracy": 0, "depth": 0, "communication": 0 },
            "satisfaction": 0-100
        }
        `;

        try {
            return await this.generateJSON<any>(prompt);
        } catch (e) {
            // Fallback if JSON fails
            return {
                score: 50,
                feedback: "Could not evaluate answer (JSON parse error).",
                redFlags: [],
                breakdown: { accuracy: 50, depth: 50, communication: 50 },
                satisfaction: 50
            };
        }
    }
}
