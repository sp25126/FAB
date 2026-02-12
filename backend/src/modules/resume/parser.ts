
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
        learnedSkills?: string[]; // [NEW]
        projectType?: 'Web App' | 'CLI' | 'Library' | 'API' | 'Other'; // [NEW]
        realWorldUtility?: string; // [NEW]
        complexity?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; // [NEW] - Parity with GitHub
        architecture?: string; // [NEW] - inferred
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
            3. CRITICAL: For each project, Infer "learnedSkills", "projectType", "realWorldUtility".
            4. ALSO INFER "complexity" (BASIC, INTERMEDIATE, ADVANCED) and "architecture" (e.g. MVC, Microservices) based on the tech stack and description.
            5. Format:
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
                        "description": "Brief description",
                        "learnedSkills": ["System Design", "Async Programming"],
                        "projectType": "Web App",
                        "realWorldUtility": "Solves X problem for Y users",
                        "complexity": "INTERMEDIATE",
                        "architecture": "Microservices"
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
            projects: (data.projects || []).map((p: any) => ({
                name: p.name,
                tech: p.tech || [],
                description: p.description,
                learnedSkills: p.learnedSkills || [],
                projectType: p.projectType || 'Other',
                realWorldUtility: p.realWorldUtility || 'Personal Project',
                complexity: p.complexity || this.calculateComplexity(p.description || '', p.tech || []),
                architecture: p.architecture || this.inferArchitecture(p.description || '', p.tech || [])
            })),
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
        let success = false;

        try {
            // 1. Get Provider and Parse
            const provider = LLMFactory.getProvider();
            console.log(`🧠 [RESUME] Using provider: ${provider.name}`);

            const data = await provider.parseResume(this.resumeText);
            const skillCount = this.countSkills(data);

            console.log(`🧠 [RESUME] Extracted ${skillCount} skills`);

            if (skillCount > 0) {
                this.processLLMResponse(data, provider.name, false);
                success = true;
            }
        } catch (error: any) {
            console.error(`🧠 [RESUME] Primary AI Failed: ${error.message}`);

            // 2. Fallback to Local if Remote failed
            if (brainType === 'remote') {
                try {
                    console.log('🔄 [RESUME] Falling back to Local Ollama...');
                    const localProvider = new OllamaProvider();
                    const data = await localProvider.parseResume(this.resumeText);
                    const skillCount = this.countSkills(data);

                    if (skillCount > 0) {
                        this.processLLMResponse(data, 'Local Ollama (Fallback)', true);
                        success = true;
                    }
                } catch (localError: any) {
                    console.error(`🧠 [RESUME] Local Fallback Failed: ${localError.message}`);
                }
            }
        }

        // 3. Last Resort: Regex Extraction
        if (!success || this.claims.length === 0) {
            // User requested NO MOCK DATA. Regex is semantic extraction, not mock.
            // But to be safe, if even regex fails, we return empty, not fake.
            console.warn("⚠️ [RESUME] AI failed completely. Using Regex extraction.");
            const regexClaims = this.extractRegexClaims();

            if (regexClaims.length > 0) {
                this.claims = regexClaims;
                this.enhancedData = {
                    skills: regexClaims,
                    // Ensure these are empty, not "Create based on regex..."
                    experience: [],
                    projects: [],
                    education: [],
                    certifications: [],
                    summary: "AI Unavailable - Skills Extracted via Pattern Matching",
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

    private calculateComplexity(description: string, tech: string[]): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' {
        const text = (description + ' ' + tech.join(' ')).toLowerCase();

        // Advanced keywords
        if (text.match(/\b(microservices|distributed|scalable|high avail|throughput|latency|real-time|websocket|grpc|graphql|docker|kubernetes|aws|cloud|ai|ml|neural|vision|blockchain|crypto|security|auth|oauth|jwt|encryption|ci\/cd|pipeline)\b/)) {
            return 'ADVANCED';
        }

        // Intermediate keywords
        if (text.match(/\b(api|database|sql|nosql|react|angular|vue|next|express|django|flask|spring|full stack|backend|frontend|responsive|mobile|app)\b/)) {
            return 'INTERMEDIATE';
        }

        return 'BASIC';
    }

    private inferArchitecture(description: string, tech: string[]): string {
        const text = (description + ' ' + tech.join(' ')).toLowerCase();

        if (text.includes('microservice')) return 'Microservices';
        if (text.includes('serverless') || text.includes('lambda')) return 'Serverless';
        if (text.includes('mvc') || text.includes('django') || text.includes('rails')) return 'MVC';
        if (text.includes('spa') || text.includes('react') || text.includes('vue')) return 'SPA';
        if (text.includes('api') || text.includes('rest') || text.includes('graphql')) return 'API-First';
        if (text.includes('monolith')) return 'Monolith';

        return 'N-Tier'; // Generic default
    }

    getClaims(): ResumeClaim[] {
        return this.claims;
    }
}
