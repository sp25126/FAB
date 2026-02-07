import { LLMProvider } from './types';
import { OllamaProvider } from './ollama';
import axios from 'axios';

export class RemoteProvider implements LLMProvider {
    public name = 'Remote (Colab GPU)';
    private baseUrl: string;
    private localProvider: OllamaProvider;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.REMOTE_BRAIN_URL || '';
        this.localProvider = new OllamaProvider();

        if (!this.baseUrl) {
            console.warn('⚠️ REMOTE_BRAIN_URL not configured, defaulting to fallback mode');
        } else {
            // Remove trailing slash if present
            this.baseUrl = this.baseUrl.replace(/\/$/, '');
            console.log(`🌐 RemoteProvider initialized with URL: ${this.baseUrl}`);
        }
    }

    async generate(prompt: string, options?: any): Promise<string> {
        if (!this.baseUrl) return this.localProvider.generate(prompt, options);

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
            console.warn(`⚠️ Cloud Brain failed: ${error.message}. Falling back to Local Brain.`);
            return this.localProvider.generate(prompt, options);
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
            console.log(`🌐 Calling Cloud Brain with Custom Persona...`);
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
            console.warn(`⚠️ Cloud evaluation failed, falling back to local.`);

            try {
                return await this.localProvider.generateJSON<any>(prompt);
            } catch (fallbackError) {
                console.warn(`⚠️ Local fallback failed: ${fallbackError}. Returning mock response.`);
                return {
                    score: 50,
                    feedback: "Service unavailable. Proceeding with neutral score.",
                    satisfaction: 50,
                    redFlags: [],
                    breakdown: { accuracy: 50, depth: 50, communication: 50 }
                };
            }
        }
    }

    /**
     * Generate interview questions using the cloud brain's dedicated endpoint.
     */
    async generateQuestions(skills: string[], projects: any[], count: number = 3): Promise<any[]> {
        try {
            console.log(`🌐 Calling /generate-questions on Colab brain...`);
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
            console.warn(`⚠️ Cloud question generation failed, falling back to local.`);

            const prompt = `Generate ${count} technical interview questions based on:
Skills: ${skills.slice(0, 5).join(', ')}
Projects: ${projects.map(p => p.name).join(', ')}

Return JSON array of strings.`;

            // Simple fallback: generate a list of strings
            try {
                const raw = await this.localProvider.generateJSON<string[]>(prompt);
                return Array.isArray(raw) ? raw.map(q => ({ text: q, type: 'TECHNICAL', difficulty: 'MEDIUM' })) : [];
            } catch (e) {
                return [];
            }
        }
    }
}
