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
            return response.data.result;
        } catch (error: any) {
            console.error('Remote Brain Error:', error.message);
            throw new Error(`Remote Brain Failed: ${error.message}`);
        }
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
