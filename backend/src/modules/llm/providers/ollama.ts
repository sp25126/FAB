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
            return response.data.response;
        } catch (error: any) {
            console.error('Ollama Error:', error.message);
            throw new Error(`Ollama Failed: ${error.message}`);
        }
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
