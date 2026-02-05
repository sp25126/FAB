import { LLMFactory, BrainType } from '../llm/factory';
import { OllamaProvider } from '../llm/ollama';

interface ResumeClaim {
    skill: string;
    category: 'language' | 'framework' | 'tool' | 'concept';
    claimed: boolean;
    evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
}

interface EnhancedResumeData {
    skills: ResumeClaim[];
    experience: {
        company: string;
        role: string;
        duration: string;
        highlights: string[];
    }[];
    projects: {
        name: string;
        tech: string[];
        description: string;
    }[];
    education: {
        degree: string;
        institution: string;
        year: string;
    }[];
    certifications: string[];
    summary: string;
    usedFallback?: boolean;
    brainUsed?: string;
}

export class ResumeParser {
    private resumeText: string;
    private claims: ResumeClaim[] = [];
    private enhancedData: EnhancedResumeData | null = null;

    constructor(resumeText: string) {
        // Clean the text: remove extra spaces, normalize line breaks
        this.resumeText = resumeText
            .toLowerCase()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')  // Replace newlines with spaces
            .trim();
    }

    private buildPrompt(): string {
        return `
            Analyze this resume text and extract ALL information into a comprehensive JSON object.
            
            RESUME TEXT:
            "${this.resumeText.substring(0, 4000)}"

            INSTRUCTIONS:
            1. Extract EVERYTHING you can find.
            2. Return ONLY valid JSON. No markdown. No explanations.
            3. Format:
            {
                "languages": ["python", "javascript"],
                "frameworks": ["react", "django", "express"],
                "tools": ["docker", "git", "aws", "kubernetes"],
                "concepts": ["rest api", "ci/cd", "agile", "microservices"],
                "experience": [
                    {
                        "company": "Company Name",
                        "role": "Job Title",
                        "duration": "2 years",
                        "highlights": ["Led team of 5", "Built API"]
                    }
                ],
                "projects": [
                    {
                        "name": "Project Name",
                        "tech": ["react", "node"],
                        "description": "Brief description"
                    }
                ],
                "education": [
                    {
                        "degree": "B.Tech Computer Science",
                        "institution": "University Name",
                        "year": "2024"
                    }
                ],
                "certifications": ["AWS Certified", "Google Cloud"],
                "summary": "Brief 1-line professional summary"
            }
            
            If a section has no data, use empty array [].
            `;
    }

    private processLLMResponse(data: any, brainUsed: string, usedFallback: boolean): void {
        // Store enhanced data
        this.enhancedData = {
            skills: [],
            experience: data.experience || [],
            projects: data.projects || [],
            education: data.education || [],
            certifications: data.certifications || [],
            summary: data.summary || '',
            usedFallback,
            brainUsed
        };

        // Map skills to Claims
        const skillCategories = ['languages', 'frameworks', 'tools', 'concepts'];
        for (const category of skillCategories) {
            const skills = data[category] || [];
            if (Array.isArray(skills)) {
                skills.forEach((skill: string) => {
                    const claim = {
                        skill: skill.toLowerCase(),
                        category: this.mapCategory(category),
                        claimed: true,
                        evidenceStrength: 'NONE' as const
                    };
                    this.claims.push(claim);
                    this.enhancedData!.skills.push(claim);
                });
            }
        }
    }

    async extractClaims(): Promise<ResumeClaim[]> {
        const brainType = process.env.BRAIN_TYPE || 'local';
        const prompt = this.buildPrompt();

        // Try primary provider first
        try {
            const provider = LLMFactory.getProvider();
            console.log(`🧠 [PRIMARY] Using provider: ${provider.name}`);

            console.log('🧠 Sending prompt to LLM...');
            const response = await provider.generate(prompt);
            console.log("🧠 LLM Response received");

            // Parse LLM JSON
            const data = this.parseJsonSafely(response);

            // Count skills extracted
            const skillCount = (data.languages?.length || 0) +
                (data.frameworks?.length || 0) +
                (data.tools?.length || 0) +
                (data.concepts?.length || 0);

            console.log(`🧠 [PRIMARY] Extracted ${skillCount} skills`);

            // Check if primary provider returned valid data
            if (skillCount === 0 && brainType === 'remote') {
                console.warn('⚠️ [FALLBACK] Remote brain returned 0 skills, falling back to local...');
                return this.fallbackToLocal(prompt);
            }

            this.processLLMResponse(data, provider.name, false);

        } catch (error: any) {
            console.error("🧠 [PRIMARY] LLM Failed:", error.message);
            require('fs').writeFileSync('llm_debug_error.txt', `Error: ${error.message}\nStack: ${error.stack}`);

            // If remote provider failed, try local fallback
            if (brainType === 'remote') {
                console.warn('⚠️ [FALLBACK] Remote brain error, falling back to local...');
                return this.fallbackToLocal(prompt);
            }
        }

        return this.claims;
    }

    private async fallbackToLocal(prompt: string): Promise<ResumeClaim[]> {
        try {
            console.log('🔄 [FALLBACK] Trying local Ollama...');
            const localProvider = new OllamaProvider();

            const response = await localProvider.generate(prompt);
            console.log("🧠 [FALLBACK] Local LLM Response received");

            const data = this.parseJsonSafely(response);

            const skillCount = (data.languages?.length || 0) +
                (data.frameworks?.length || 0) +
                (data.tools?.length || 0) +
                (data.concepts?.length || 0);

            console.log(`🧠 [FALLBACK] Extracted ${skillCount} skills using local brain`);

            this.processLLMResponse(data, 'Local Ollama (Fallback)', true);

        } catch (fallbackError: any) {
            console.error("🧠 [FALLBACK] Local LLM also failed:", fallbackError.message);
            require('fs').appendFileSync('llm_debug_error.txt', `\nFallback Error: ${fallbackError.message}`);
        }

        return this.claims;
    }

    getEnhancedData(): EnhancedResumeData | null {
        return this.enhancedData;
    }

    private parseJsonSafely(text: string): any {
        require('fs').writeFileSync('llm_debug_response.txt', text);
        try {
            // Try direct parse
            return JSON.parse(text);
        } catch (e) {
            // Try extracting from code block
            const match = text.match(/```json([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    return JSON.parse(match[1] || match[0]);
                } catch (e2) {
                    return {};
                }
            }
            return {};
        }
    }

    private mapCategory(cat: string): any {
        if (cat.includes('lang')) return 'language';
        if (cat.includes('frame')) return 'framework';
        if (cat.includes('tool')) return 'tool';
        return 'concept';
    }

    getClaims(): ResumeClaim[] {
        return this.claims;
    }
}


