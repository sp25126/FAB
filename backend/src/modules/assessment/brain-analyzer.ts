import { LLMFactory } from '../llm/factory';
import type { LLMProvider } from '../llm/types';
import { Logger } from '../logger';
import * as crypto from 'crypto';

/**
 * BrainAnalyzer: AI-powered analysis service for resume and GitHub data
 * Uses user's chosen Brain (local/remote) for comprehensive, detailed insights
 */
export class BrainAnalyzer {
    private llm: LLMProvider | null = null;
    private brainType: string;
    private static cache = new Map<string, any>();
    private static readonly LLM_CALL_TIMEOUT = 300_000; // 300 seconds (5 mins) per LLM call

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brainType = brainType;
    }

    /**
     * Wrap a promise with a timeout to prevent indefinite hangs
     */
    private async withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = BrainAnalyzer.LLM_CALL_TIMEOUT): Promise<T> {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`[BrainAnalyzer] ${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
        );
        return Promise.race([promise, timeout]);
    }

    private getCacheKey(prefix: string, data: any): string {
        const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
        return `${prefix}:${hash}`;
    }

    /**
     * Initialize LLM connection with fallback (with timeout)
     */
    private async ensureLLM(): Promise<LLMProvider> {
        if (!this.llm) {
            Logger.info(`[BrainAnalyzer] Initializing ${this.brainType} brain...`);
            this.llm = await this.withTimeout(
                LLMFactory.getProviderWithFallback(this.brainType),
                'LLM initialization',
                60_000 // 60 seconds for initialization
            );
            Logger.info(`[BrainAnalyzer] Brain initialized successfully`);
        }
        return this.llm;
    }

    /**
     * Generic safe AI generation method for other analyzers
     */
    public async generateInsights(
        prompt: string,
        maxTokens: number = 800,
        temperature: number = 0.3
    ): Promise<any> {
        const llm = await this.ensureLLM();
        try {
            const start = Date.now();
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature, maxTokens }),
                'generateInsights'
            );
            Logger.llmInference('generateInsights', Date.now() - start);
            return this.extractJSON(response);
        } catch (error) {
            Logger.error('[BrainAnalyzer] Insight generation failed:', error);
            return {};
        }
    }

    /**
     * Deep Resume Analysis: Extract context, experience level, and expertise
     */
    async analyzeResumeDeep(resumeText: string): Promise<{
        experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Unknown';
        domains: string[];
        keyStrengths: string[];
        workStyle: string;
        careerTrajectory: string;
    }> {
        const cacheKey = this.getCacheKey('resume', resumeText.slice(0, 5000));
        if (BrainAnalyzer.cache.has(cacheKey)) {
            Logger.info('[BrainAnalyzer] Using cached resume analysis');
            return BrainAnalyzer.cache.get(cacheKey);
        }

        const llm = await this.ensureLLM();

        const prompt = `Analyze this resume deeply and extract insights:

RESUME:
${resumeText}

Provide a JSON response with:
{
  "experienceLevel": "Junior/Mid/Senior/Lead/Unknown",
  "domains": ["array of technical domains like AI/ML, Web Dev, DevOps, etc."],
  "keyStrengths": ["array of 3-5 standout strengths based on context"],
  "workStyle": "brief description of work approach (team player, solo builder, etc.)",
  "careerTrajectory": "brief summary of career progression and direction"
}

Be specific and data-driven. Base conclusions on actual evidence.`;

        try {
            const start = Date.now();
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature: 0.3, maxTokens: 800 }),
                'analyzeResumeDeep'
            );
            const duration = Date.now() - start;

            Logger.llmInference('analyzeResumeDeep', duration);

            const parsed = this.extractJSON(response);

            const result = {
                experienceLevel: parsed.experienceLevel || 'Unknown',
                domains: parsed.domains || [],
                keyStrengths: parsed.keyStrengths || [],
                workStyle: parsed.workStyle || 'Not enough information',
                careerTrajectory: parsed.careerTrajectory || 'Not enough information'
            };

            BrainAnalyzer.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            Logger.error('[BrainAnalyzer] Resume deep analysis failed:', error);
            return {
                experienceLevel: 'Unknown',
                domains: [],
                keyStrengths: [],
                workStyle: 'Analysis unavailable',
                careerTrajectory: 'Analysis unavailable'
            };
        }
    }

    /**
     * Analyze GitHub Projects: Understand architecture, code quality, and real-world utility
     */
    async analyzeGitHubProject(
        projectName: string,
        description: string,
        readme: string,
        codeFiles: { path: string; content: string }[]
    ): Promise<{
        architecturePatterns: string[];
        codeQualityScore: number;
        documentationScore: number;
        realWorldUtility: string;
        advancedTechniques: string[];
        complexity: 'Beginner' | 'Intermediate' | 'Advanced';
        features: string[];
        scoreReasoning: string;
    }> {
        const cacheKey = this.getCacheKey('project', { projectName, description, readme: readme.slice(0, 500) });
        if (BrainAnalyzer.cache.has(cacheKey)) {
            return BrainAnalyzer.cache.get(cacheKey);
        }

        const llm = await this.ensureLLM();

        // Limit code samples to avoid token overflow
        const codeSamples = codeFiles.slice(0, 3).map(f =>
            `File: ${f.path}\n${f.content.slice(0, 500)}\n...`
        ).join('\n\n');

        const prompt = `Analyze this GitHub project for technical depth and key features:

PROJECT: ${projectName}
DESCRIPTION: ${description}

README SNIPPET:
${readme.slice(0, 1000)}

CODE SAMPLES:
${codeSamples}

Provide JSON response:
{
  "architecturePatterns": ["patterns used: MVC, microservices, etc."],
  "codeQualityScore": 0-100,
  "documentationScore": 0-100 (based on README completeness),
  "realWorldUtility": "what problem does this solve?",
  "advancedTechniques": ["advanced concepts"],
  "complexity": "Beginner/Intermediate/Advanced",
  "features": ["Top 1 to 10 key functional features"],
  "scoreReasoning": "Detailed explanation of the code quality and complexity scores. Why was this score given? Cite specific file patterns or architectural choices."
}

Base assessment on actual code, not assumptions. Be detailed and reasoning-focused for the scoreReasoning.`;

        try {
            const start = Date.now();
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature: 0.3, maxTokens: 800 }),
                'analyzeGitHubProject'
            );
            const duration = Date.now() - start;

            Logger.llmInference(`analyzeGitHubProject:${projectName}`, duration);

            const parsed = this.extractJSON(response);

            const result = {
                architecturePatterns: parsed.architecturePatterns || [],
                codeQualityScore: parsed.codeQualityScore || 50,
                documentationScore: parsed.documentationScore || 50,
                realWorldUtility: parsed.realWorldUtility || 'Unknown',
                advancedTechniques: parsed.advancedTechniques || [],
                complexity: parsed.complexity || 'Intermediate',
                features: parsed.features || [],
                scoreReasoning: parsed.scoreReasoning || 'No detailed reasoning provided.'
            };

            BrainAnalyzer.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            Logger.error('[BrainAnalyzer] GitHub project analysis failed:', error);
            return {
                architecturePatterns: [],
                codeQualityScore: 50,
                documentationScore: 50,
                realWorldUtility: 'Analysis unavailable',
                advancedTechniques: [],
                complexity: 'Intermediate',
                features: [],
                scoreReasoning: 'Analysis unavailable due to error.'
            };
        }
    }

    /**
     * Explain Verification: Reasoning-based skill verification with confidence
     */
    async explainVerification(
        skill: string,
        resumeContext: string,
        githubEvidence: {
            repos: string[];
            codeExamples: string[];
            techStack: string[];
        }
    ): Promise<{
        verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT';
        confidence: number;
        reasoning: string;
        recommendation: string;
    }> {
        const cacheKey = this.getCacheKey('verify', { skill, githubEvidence });
        if (BrainAnalyzer.cache.has(cacheKey)) {
            return BrainAnalyzer.cache.get(cacheKey);
        }

        const llm = await this.ensureLLM();

        const prompt = `Verify this skill claim with reasoning:

SKILL CLAIMED: ${skill}

RESUME CONTEXT:
${resumeContext}

GITHUB EVIDENCE:
- Repos mentioning skill: ${githubEvidence.repos.join(', ') || 'None'}
- Code examples: ${githubEvidence.codeExamples.join(', ') || 'None'}
- Related tech: ${githubEvidence.techStack.join(', ') || 'None'}

Provide JSON:
{
  "verdict": "VERIFIED/WEAK_SUPPORT/OVERCLAIMED/FRAUDULENT",
  "confidence": 0-100,
  "reasoning": "detailed explanation of why this verdict",
  "recommendation": "actionable advice if weak/overclaimed"
}

Verdicts:
- VERIFIED: Strong GitHub evidence supports claim
- WEAK_SUPPORT: Some evidence but limited depth
- OVERCLAIMED: Claim exceeds actual usage
- FRAUDULENT: No evidence whatsoever`;

        try {
            const start = Date.now();
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature: 0.2, maxTokens: 400 }),
                'explainVerification'
            );
            const duration = Date.now() - start;

            Logger.llmInference(`explainVerification:${skill}`, duration);

            const parsed = this.extractJSON(response);

            const result = {
                verdict: parsed.verdict || 'WEAK_SUPPORT',
                confidence: parsed.confidence || 50,
                reasoning: parsed.reasoning || 'Unable to determine',
                recommendation: parsed.recommendation || 'Build more projects using this skill'
            };

            BrainAnalyzer.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            Logger.error('[BrainAnalyzer] Verification explanation failed:', error);
            return {
                verdict: 'WEAK_SUPPORT',
                confidence: 50,
                reasoning: 'Analysis error occurred',
                recommendation: 'Manual review recommended'
            };
        }
    }

    /**
     * Generate Personalized Recommendations based on profile and gaps
     */
    async generateRecommendations(
        profile: {
            experienceLevel: string;
            domains: string[];
            strengths: string[];
            gaps: string[];
        },
        skillGaps: string[]
    ): Promise<Array<{
        title: string;
        description: string;
        why: string;
        techStack: string[];
        difficulty: string;
        estimatedTime: string;
        prerequisites: string[];
    }>> {
        const llm = await this.ensureLLM();

        const prompt = `Generate 3 personalized project recommendations:

PROFILE:
- Experience Level: ${profile.experienceLevel}
- Domains: ${profile.domains.join(', ')}
- Strengths: ${profile.strengths.join(', ')}
- Current Gaps: ${profile.gaps.join(', ')}

SKILLS NEEDING PROOF:
${skillGaps.join(', ')}

Provide JSON array of 3 recommendations:
[{
  "title": "Specific project name",
  "description": "What to build (2-3 sentences)",
  "why": "Why THIS project for THIS person specifically",
  "techStack": ["specific technologies to use"],
  "difficulty": "Beginner/Intermediate/Advanced",
  "estimatedTime": "realistic time estimate",
  "prerequisites": ["what to learn first if needed"]
}]

Make recommendations:
1. Progressively difficult (easy → medium → hard)
2. Relevant to their domain
3. Address specific gaps
4. Build on existing strengths`;

        try {
            const start = Date.now();
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature: 0.5, maxTokens: 1200 }),
                'generateRecommendations'
            );
            const duration = Date.now() - start;

            Logger.llmInference('generateRecommendations', duration);

            const parsed = this.extractJSON(response);

            if (Array.isArray(parsed)) {
                return parsed.slice(0, 3);
            }
            return [];
        } catch (error) {
            Logger.error('[BrainAnalyzer] Recommendation generation failed:', error);
            return [];
        }
    }

    /**
     * Generate Detailed Score Explanation
     */
    async explainScore(
        scoreName: string,
        scoreValue: number,
        evidence: {
            positive: string[];
            negative: string[];
            metrics: Record<string, any>;
        }
    ): Promise<{
        explanation: string;
        grade: string;
        improvements: string[];
    }> {
        const llm = await this.ensureLLM();

        const prompt = `Explain this score with actionable insights:

SCORE: ${scoreName} = ${scoreValue}/100

POSITIVE EVIDENCE:
${evidence.positive.join('\n')}

NEGATIVE FACTORS:
${evidence.negative.join('\n')}

METRICS:
${JSON.stringify(evidence.metrics, null, 2)}

Provide JSON:
{
  "explanation": "2-3 sentence explanation of score",
  "grade": "A+/A/A-/B+/B/B-/C+/C/C-/D/F",
  "improvements": ["array of 2-3 specific actions to improve this score"]
}`;

        try {
            const response = await this.withTimeout(
                llm.generate(prompt, { temperature: 0.3, maxTokens: 400 }),
                'assessCodeQuality'
            );
            const parsed = this.extractJSON(response);

            return {
                explanation: parsed.explanation || 'Score calculated based on available data',
                grade: parsed.grade || this.scoreToGrade(scoreValue),
                improvements: parsed.improvements || []
            };
        } catch (error) {
            Logger.error('[BrainAnalyzer] Score explanation failed:', error);
            return {
                explanation: 'Score based on quantitative metrics',
                grade: this.scoreToGrade(scoreValue),
                improvements: []
            };
        }
    }

    /**
     * Helper: Extract JSON from LLM response
     */
    /**
     * Helper: Extract and Parse JSON from LLM response
     * Handles markdown code blocks, finding outer braces, and basic repair.
     */
    public extractJSON(text: string): any {
        if (!text) return {};

        try {
            // 1. Remove markdown code blocks (```json ... ```)
            let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();

            // 2. Find the first '{' or '[' and the last '}' or ']'
            const firstOpenBrace = clean.indexOf('{');
            const firstOpenBracket = clean.indexOf('[');
            const firstOpen = (firstOpenBrace === -1) ? firstOpenBracket :
                (firstOpenBracket === -1) ? firstOpenBrace :
                    Math.min(firstOpenBrace, firstOpenBracket);

            const lastCloseBrace = clean.lastIndexOf('}');
            const lastCloseBracket = clean.lastIndexOf(']');
            const lastClose = Math.max(lastCloseBrace, lastCloseBracket);

            if (firstOpen !== -1 && lastClose > firstOpen) {
                clean = clean.substring(firstOpen, lastClose + 1);
            }

            // 3. Attempt parse
            return JSON.parse(clean);
        } catch (error) {
            Logger.warn('[BrainAnalyzer] JSON extraction failed', { error: error, raw: text.substring(0, 100) + '...' });

            // 4. Fallback: Try to clean common trailing commas or simple fixups if needed
            // For now, return empty object to prevent crash
            return {};
        }
    }

    /**
     * Helper: Convert score to letter grade
     */
    private scoreToGrade(score: number): string {
        if (score >= 97) return 'A+';
        if (score >= 93) return 'A';
        if (score >= 90) return 'A-';
        if (score >= 87) return 'B+';
        if (score >= 83) return 'B';
        if (score >= 80) return 'B-';
        if (score >= 77) return 'C+';
        if (score >= 73) return 'C';
        if (score >= 70) return 'C-';
        if (score >= 60) return 'D';
        return 'F';
    }
}
