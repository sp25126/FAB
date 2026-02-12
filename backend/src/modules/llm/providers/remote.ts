import axios from 'axios';
import { LLMProvider } from '../types';

export class RemoteBrainProvider implements LLMProvider {
    name = 'remote_brain';
    private baseUrl: string;

    constructor(url: string) {
        this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    }

    async generate(prompt: string): Promise<string> {
        try {
            const response = await axios.post(`${this.baseUrl}/generate`, {
                prompt,
                max_tokens: 2048,
                temperature: 0.3
            });
            return (response.data as any).result;
        } catch (error: any) {
            console.error('Remote Brain Error:', error.message);
            throw new Error(`Remote Brain Failed: ${error.message}`);
        }
    }

    async generateJSON<T>(prompt: string): Promise<T> {
        const rawResponse = await this.generate(prompt + '\nRespond ONLY with valid JSON.');
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No JSON found in response');
            return JSON.parse(jsonMatch[0]) as T;
        } catch (error: any) {
            console.error('Remote Brain JSON Parse Error:', error.message);
            throw new Error(`Failed to parse JSON from Remote Brain: ${error.message}`);
        }
    }

    async healthCheck(): Promise<boolean> {
        return this.isAvailable();
    }

    async evaluateAnswer(question: string, answer: string, expectedPoints?: string[], context?: string): Promise<any> {
        const prompt = `Evaluate this answer:\nQuestion: ${question}\nAnswer: ${answer}\nExpected: ${(expectedPoints || []).join(', ')}\nContext: ${context || 'None'}\nReturn JSON: {"score": 0-100, "feedback": "...", "redFlags": [], "satisfaction": 0-100}`;
        return this.generateJSON(prompt);
    }

    async parseResume(resumeText: string): Promise<any> {
        const prompt = `Parse this resume and extract structured data:\n${resumeText}\nReturn JSON with: name, email, skills, experience, education, projects`;
        return this.generateJSON(prompt);
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(this.baseUrl);
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
