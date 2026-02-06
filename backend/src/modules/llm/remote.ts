import { LLMProvider } from './types';
import axios from 'axios';

export class RemoteProvider implements LLMProvider {
    public name = 'Remote (Colab GPU)';
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.REMOTE_BRAIN_URL || '';
        if (!this.baseUrl) {
            throw new Error('REMOTE_BRAIN_URL not configured');
        }
        // Remove trailing slash if present
        this.baseUrl = this.baseUrl.replace(/\/$/, '');
        console.log(`🌐 RemoteProvider initialized with URL: ${this.baseUrl}`);
    }

    async generate(prompt: string, options?: any): Promise<string> {
        try {
            console.log(`🌐 Sending request to Colab brain...`);

            const response = await axios.post(
                `${this.baseUrl}/generate`,
                { prompt: prompt },
                {
                    timeout: 120000,  // 2 minute timeout for slow GPU
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'  // Skip ngrok warning page
                    }
                }
            );

            const data = response.data as any;
            console.log(`🌐 Colab response received`);

            // Colab returns { result: "..." }
            return data.result || data.response || JSON.stringify(data);
        } catch (error: any) {
            console.error('🌐 Remote Generate Error:', error.message);

            if (error.code === 'ECONNREFUSED') {
                throw new Error('Colab brain not reachable. Is it running?');
            }

            if (error.response && error.response.status === 404) {
                throw new Error('Colab URL 404 Not Found. Your ngrok tunnel likely expired. Please copy the NEW URL from Colab.');
            }

            throw new Error(`Failed to get response from Colab: ${error.message}`);
        }
    }

    async generateJSON<T>(prompt: string): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanations.`;
        const response = await this.generate(jsonPrompt);

        try {
            return JSON.parse(response) as T;
        } catch (e) {
            // Try to extract JSON from response
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]) as T;
            }
            throw new Error('Failed to parse JSON from remote response');
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000,
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}
