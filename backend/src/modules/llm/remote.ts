import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import axios from 'axios';
import { Logger } from '../logger';

export class RemoteProvider implements LLMProvider {
    public name = 'Remote (Colab GPU)';
    private baseUrl: string;
    private localProvider: OllamaProvider;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.REMOTE_BRAIN_URL || '';
        this.localProvider = new OllamaProvider();

        if (!this.baseUrl) {
            Logger.warn('⚠️ REMOTE_BRAIN_URL not configured, defaulting to fallback mode');
        } else {
            // Remove trailing slash if present
            this.baseUrl = this.baseUrl.replace(/\/$/, '');
            Logger.info(`🌐 Remote (GPU) initialized with URL: ${this.baseUrl.substring(0, 20)}...`);
        }
    }

    async generate(prompt: string, options?: any): Promise<string> {
        if (!this.baseUrl) return this.localProvider.generate(prompt, options);

        try {
            Logger.info(`🌐 [Cloud Brain] Processing request...`);

            const response = await axios.post(
                `${this.baseUrl}/generate`,
                { prompt: prompt },
                {
                    timeout: 180000,  // 3 minute timeout for slow GPU
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'  // Skip ngrok warning page
                    }
                }
            );

            const data = response.data as any;
            Logger.info(`🌐 [Cloud Brain] Response received`);

            // Colab returns { result: "..." }
            return data.result || data.response || JSON.stringify(data);
        } catch (error: any) {
            console.warn(`⚠️ Cloud Brain failed: ${error.message}`);
            if (error.response?.data) {
                console.warn(`⚠️ Cloud Error details:`, JSON.stringify(error.response.data));
            }
            throw error;
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
            return this.localProvider.healthCheck();
        }
    }

    /**
     * Evaluate a candidate's answer using the cloud brain's dedicated endpoint.
     * Falls back to generate if the endpoint doesn't exist.
     */
    async evaluateAnswer(question: string, answer: string, expectedPoints: string[] = [], context: string = ''): Promise<any> {
        const systemPrompt = "You are a Senior Engineering Manager (10+ years exp). Be BRUTALLY HONEST. Do not sugarcoat. If the answer is vague, destroy it. If it's wrong, say it's wrong.";

        const prompt = `Evaluate this interview answer:
Question: ${question}
Context: ${context}
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
    "satisfaction": 0-100,
    "redFlags": ["flag1", "flag2"],
    "breakdown": { "accuracy": 0, "depth": 0, "communication": 0 }
}`;

        try {
            Logger.info(`🌐 [Cloud Brain] Evaluating answer with Persona...`);
            // Use generic generate to inject system prompt
            const response = await axios.post(
                `${this.baseUrl}/generate`,
                {
                    prompt: prompt + "\n\nRESTRICT TO JSON FORMAT.",
                    system_prompt: systemPrompt,
                    max_tokens: 1024,
                    temperature: 0.4
                },
                {
                    timeout: 60000,
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                }
            );

            const data = response.data as any;
            let result = data.result;

            // Clean up if needed (markdown stripping)
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) result = jsonMatch[0];

            return JSON.parse(result);

        } catch (error: any) {
            console.warn(`⚠️ Cloud evaluation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate interview questions using the cloud brain's dedicated endpoint.
     */
    async generateQuestions(skills: string[], projects: any[], count: number = 3): Promise<any[]> {
        try {
            Logger.info(`🌐 [Cloud Brain] /generate-questions...`);
            const response = await axios.post(
                `${this.baseUrl}/generate-questions`,
                { skills, projects, count },
                {
                    timeout: 120000,
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );
            console.log(`🌐 Questions generated by cloud brain`);
            const data = response.data as { questions?: any[] };
            return data.questions || [];
        } catch (error: any) {
            console.warn(`⚠️ Cloud question generation failed: ${error.message}`);
            throw error;
        }
    }
    async parseResume(resumeText: string): Promise<any> {
        if (!this.baseUrl) return this.localProvider.parseResume(resumeText);

        try {
            Logger.info(`🌐 [Cloud Brain] /analyze-resume...`);
            const response = await axios.post(
                `${this.baseUrl}/analyze-resume`,
                { resume_text: resumeText },
                {
                    timeout: 120000,
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );

            const data = response.data as any;
            if (data.analysis) {
                console.log(`🌐 Resume analyzed by cloud brain`);
                return data.analysis;
            }
            throw new Error("No analysis data returned");

        } catch (error: any) {
            console.warn(`⚠️ Cloud resume analysis failed: ${error.message}`);
            throw error;
        }
    }
}
