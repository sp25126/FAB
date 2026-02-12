import axios from 'axios';
import { LLMProvider } from '../types';

export class OllamaProvider implements LLMProvider {
    name = 'ollama';
    private baseUrl = 'http://localhost:11434';
    private model = 'gemma2:2b'; // Default model

    async generate(prompt: string): Promise<string> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false
            });
            return (response.data as any).response;
        } catch (error: any) {
            console.error('Ollama Error:', error.message);
            throw new Error(`Ollama Failed: ${error.message}`);
        }
    }

    async generateJSON<T>(prompt: string): Promise<T> {
        const rawResponse = await this.generate(prompt + '\nRespond ONLY with valid JSON.');
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No JSON found in response');
            return JSON.parse(jsonMatch[0]) as T;
        } catch (error: any) {
            console.error('Ollama JSON Parse Error:', error.message);
            throw new Error(`Failed to parse JSON from Ollama: ${error.message}`);
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
            const response = await axios.get(`${this.baseUrl}/api/tags`);
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
