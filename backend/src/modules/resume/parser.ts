
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

// Regex patterns for fallback skill extraction
const SKILL_PATTERNS = {
    languages: /\b(python|javascript|typescript|java|c\+\+|c#|ruby|go|rust|php|swift|kotlin|scala|perl|lua|r|matlab|dart)\b/gi,
    frameworks: /\b(react|angular|vue|svelte|next\.?js|express|django|flask|fastapi|spring|laravel|rails|flutter|react native|electron)\b/gi,
    tools: /\b(docker|kubernetes|aws|gcp|azure|git|jenkins|circleci|terraform|ansible|prometheus|grafana|redis|mongodb|postgresql|mysql)\b/gi,
    concepts: /\b(rest api|graphql|microservices|ci\/cd|agile|scrum|tdd|oop|functional programming|system design|data structures|algorithms)\b/gi
};

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

    private extractRegexClaims(): ResumeClaim[] {
        const regexClaims: ResumeClaim[] = [];
        const seenSkills = new Set<string>();

        // Check each category
        for (const [category, pattern] of Object.entries(SKILL_PATTERNS)) {
            const matches = this.resumeText.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const skill = match.toLowerCase();
                    if (!seenSkills.has(skill)) {
                        seenSkills.add(skill);
                        regexClaims.push({
                            skill,
                            category: this.mapCategory(category),
                            claimed: true,
                            evidenceStrength: 'NONE'
                        });
                    }
                });
            }
        }
        return regexClaims;
    }

    async extractClaims(): Promise<ResumeClaim[]> {
        const brainType = process.env.BRAIN_TYPE || 'local';
        const prompt = this.buildPrompt();
        let success = false;

        // 1. Try Primary LLM Provider
        try {
            const provider = LLMFactory.getProvider();
            console.log(`🧠 [PRIMARY] Using provider: ${provider.name}`);
            console.log('🧠 Sending prompt to LLM...');
            const response = await provider.generate(prompt);
            console.log("🧠 LLM Response received");

            const data = this.parseJsonSafely(response);
            const skillCount = this.countSkills(data);
            console.log(`🧠 [PRIMARY] Extracted ${skillCount} skills`);

            if (skillCount > 0) {
                this.processLLMResponse(data, provider.name, false);
                success = true;
            } else if (brainType === 'remote') {
                console.warn('⚠️ [FALLBACK] Remote brain returned 0 skills, trying local...');
                // Fall through to local
                throw new Error("Remote returned 0 skills");
            }
        } catch (error: any) {
            console.error(`🧠 [PRIMARY] Failed: ${error.message}`);
        }

        // 2. Try Local Fallback if primary failed
        if (!success && brainType === 'remote') {
            try {
                console.log('🔄 [FALLBACK] Trying local Ollama...');
                const localProvider = new OllamaProvider();
                const response = await localProvider.generate(prompt);
                console.log("🧠 [FALLBACK] Local LLM response received");

                const data = this.parseJsonSafely(response);
                const skillCount = this.countSkills(data);

                if (skillCount > 0) {
                    this.processLLMResponse(data, 'Local Ollama (Fallback)', true);
                    success = true;
                }
            } catch (error: any) {
                console.error(`🧠 [FALLBACK] Local Failed: ${error.message}`);
            }
        }

        // 3. Last Resort: Regex Extraction
        if (!success || this.claims.length === 0) {
            console.warn("⚠️ [FALLBACK] AI failed completely. Using Regex extraction.");
            const regexClaims = this.extractRegexClaims();

            if (regexClaims.length > 0) {
                this.claims = regexClaims;
                this.enhancedData = {
                    skills: regexClaims,
                    experience: [],
                    projects: [],
                    education: [],
                    certifications: [],
                    summary: "Create based on regex extraction (AI unavailable)",
                    usedFallback: true,
                    brainUsed: "Regex Pattern Matcher"
                };
                console.log(`🧠 [REGEX] Extracted ${regexClaims.length} skills via patterns`);
            }
        }

        return this.claims;
    }

    getEnhancedData(): EnhancedResumeData | null {
        return this.enhancedData;
    }

    private parseJsonSafely(text: string): any {
        require('fs').writeFileSync('llm_debug_response.txt', text);
        try {
            return JSON.parse(text);
        } catch (e) {
            const match = text.match(/```json([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[1] || match[0]); } catch (e2) { return {}; }
            }
            return {};
        }
    }

    private countSkills(data: any): number {
        return (data.languages?.length || 0) +
            (data.frameworks?.length || 0) +
            (data.tools?.length || 0) +
            (data.concepts?.length || 0);
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
