import axios from 'axios';
import { LLMProvider } from './types';
import { spawn } from 'child_process';
import { Logger } from '../logger';

export class OllamaProvider implements LLMProvider {
    public name = 'Ollama (Local)';
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model?: string) {
        this.baseUrl = baseUrl;
        this.model = model || process.env.LOCAL_BRAIN_MODEL || 'gemma2:2b';
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
            Logger.error('Ollama Generate Error:', error);
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
                format: 'json',
                stream: false,
                options: {
                    num_predict: 4096, // Increase token limit for long responses
                    temperature: 0.7
                }
            }, {
                timeout: 120000 // 2 minute timeout locally
            });

            let content = (response.data as any).response;

            // CLEANUP: Handle Markdown code blocks if model ignores "JSON ONLY"
            if (content.includes('```json')) {
                content = content.replace(/```json\n?|\n?```/g, '');
            } else if (content.includes('```')) {
                content = content.replace(/```\n?|\n?```/g, '');
            }

            // CLEANUP: Trim noise
            content = content.trim();

            try {
                return JSON.parse(content) as T;
            } catch (parseError) {
                Logger.error("JSON Parse Logic Failed. Raw Content:", content);
                throw parseError;
            }

        } catch (error: any) {
            Logger.error('Ollama JSON Error:', error);
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

    async startService(): Promise<void> {
        Logger.info("🚀 Attempting to auto-start Ollama service...");
        try {
            const process = spawn('ollama', ['serve'], {
                detached: true,
                stdio: 'ignore',
                shell: true
            });
            process.unref();
            console.log("✅ Ollama start command issued (detached)");
        } catch (e: any) {
            console.error("❌ Failed to start Ollama:", e.message);
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
    async parseResume(resumeText: string): Promise<any> {
        const prompt = `
            Analyze this resume text and extract ALL information into a comprehensive JSON object.
            
            RESUME TEXT:
            "${resumeText.substring(0, 4000)}"

            INSTRUCTIONS:
            1. Extract EVERYTHING you can find.
            2. Return ONLY valid JSON. No markdown. No explanations.
            3. Format:
            {
                "languages": ["python", "javascript"],
                "frameworks": ["react", "django"],
                "tools": ["docker", "git"],
                "concepts": ["agile", "rest api"],
                "experience": [{"company": "Name", "role": "Title", "duration": "Dates", "highlights": ["..."]}],
                "projects": [{"name": "Title", "tech": ["stack"], "description": "..."}],
                "education": [{"degree": "Degree", "institution": "Name", "year": "Year"}],
                "certifications": ["Cert Name"],
                "summary": "Brief summary"
            }
            If a section has no data, use empty array [].
        `;

        try {
            return await this.generateJSON<any>(prompt);
        } catch (e) {
            Logger.error('Ollama Resume Parse Error:', e);
            throw e;
        }
    }
}
