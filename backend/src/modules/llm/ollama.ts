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
            return response.data.response;
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

            const content = response.data.response;
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
}
