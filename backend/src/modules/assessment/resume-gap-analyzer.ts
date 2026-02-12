import { BrainAnalyzer } from './brain-analyzer';
import { ResumeParser } from '../resume/parser';
import { Logger } from '../logger';
import { ProfileRepository } from '../profile/repository';

/**
 * Resume Gap Analyzer
 * Identifies skills lacking GitHub proof and generates project ideas to fill gaps
 */
export class ResumeGapAnalyzer {
    private brain: BrainAnalyzer;
    private profileRepo: ProfileRepository;

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brain = new BrainAnalyzer(brainType);
        this.profileRepo = new ProfileRepository();
    }

    /**
     * Analyze resume gaps against GitHub evidence
     */
    async analyzeGaps(
        resumeText: string,
        username: string,
        githubToken: string,
        focusRole?: string,
        forceRefresh: boolean = false
    ): Promise<ResumeGapAnalysis> {
        Logger.info(`[ResumeGap] Analyzing gaps for ${username} (Force Refresh: ${forceRefresh})`);

        // 1. Check Stored Analysis (Skip if forceRefresh is true)
        if (!forceRefresh) {
            try {
                const history = await this.profileRepo.getGrowthHistory(username);
                const gapEntry = history.find(h => h.metric === 'resume_gap_analysis');
                if (gapEntry) {
                    const report = gapEntry.details;
                    // Return only if report looks valid and fresh enough (optional check)
                    if (report && report.recommendations) {
                        Logger.info(`[ResumeGap] Returning stored analysis for ${username}`);
                        return report;
                    }
                }
            } catch (ignore) {
                // cache miss
            }
        }

        // 2. Parse resume claims
        const parser = new ResumeParser(resumeText);
        const claims = await parser.extractClaims();

        // 3. Fetch GitHub projects
        const githubEvidence = await this.fetchGitHubEvidence(username, githubToken);

        // 4. Cross-reference claims with GitHub evidence
        const verified: string[] = [];
        const weakEvidence: GapAnalysis[] = [];
        const noEvidence: GapAnalysis[] = [];

        // 4. Cross-reference claims with GitHub evidence (Parallelized)
        const analysisPromises = claims.map(async (claim) => {
            const skill = claim.skill.toLowerCase();
            const evidence = this.findEvidence(skill, githubEvidence);

            if (evidence.strength === 'strong') {
                return { type: 'verified', skill: claim.skill };
            } else if (evidence.strength === 'weak') {
                const proofSuggestion = await this.generateProofSuggestion(
                    claim.skill,
                    evidence.projects,
                    'enhance'
                );
                return {
                    type: 'weak',
                    data: {
                        skill: claim.skill,
                        resumeClaim: `Mentioned in resume`,
                        currentEvidence: evidence.description,
                        severity: 'medium' as const,
                        reason: `Limited GitHub evidence for ${claim.skill}`,
                        proofSuggestion
                    }
                };
            } else {
                const proofSuggestion = await this.generateProofSuggestion(
                    claim.skill,
                    githubEvidence.projects.map(p => p.name),
                    'new'
                );
                return {
                    type: 'none',
                    data: {
                        skill: claim.skill,
                        resumeClaim: `Claimed in resume`,
                        currentEvidence: 'None',
                        severity: 'high' as const,
                        reason: focusRole
                            ? `Critical for ${focusRole} roles, but no GitHub proof`
                            : 'No GitHub evidence found',
                        proofSuggestion
                    }
                };
            }
        });

        const results = await Promise.all(analysisPromises);

        for (const res of results) {
            if (res.type === 'verified') verified.push(res.skill as string);
            else if (res.type === 'weak') weakEvidence.push(res.data as GapAnalysis);
            else if (res.type === 'none') noEvidence.push(res.data as GapAnalysis);
        }

        // 5. Generate detailed AI reasoning
        const reasoningPrompt = `Analyze these resume gaps for a ${focusRole || 'Software Engineer'} role:
        
        Verified Skills: ${verified.join(', ')}
        Weak Evidence: ${weakEvidence.map(w => w.skill).join(', ')}
        Missing Evidence: ${noEvidence.map(n => n.skill).join(', ')}
        
        Provide a strategic analysis of how these specific gaps impact employability and a high-level strategy to fix them. 
        Focus on the "Why" and "How" at a career strategy level. Max 3-4 sentences.`;

        // 5. Generate detailed AI reasoning
        let aiReasoning = "Focus on building projects that demonstrate your core claimed skills to validate your resume.";
        try {
            const result = await this.brain.generateInsights(reasoningPrompt, 500, 0.4);
            if (result && result.reasoning) {
                aiReasoning = result.reasoning;
            }
        } catch (error) {
            Logger.warn('[ResumeGap] AI reasoning generation failed, using fallback:', error);
            // Fallback is already set
        }

        // 6. Generate recommendations
        const recommendations = this.generateRecommendations(weakEvidence, noEvidence);

        // 7. Generate "Gap Crusher" Project (if critical gaps exist)
        let gapCrusherProject = null;
        if (noEvidence.length > 0 || weakEvidence.length > 0) {
            const gapsToTarget = [...noEvidence.map(g => g.skill), ...weakEvidence.map(g => g.skill)];
            gapCrusherProject = await this.generateGapCrusherProject(gapsToTarget, 'Intermediate');
        }

        const analysis: ResumeGapAnalysis = {
            summary: {
                totalClaims: claims.length,
                verified: verified.length,
                weakEvidence: weakEvidence.length,
                noEvidence: noEvidence.length
            },
            criticalGaps: noEvidence.slice(0, 5), // Top 5 critical
            weakEvidence: weakEvidence.slice(0, 5),
            recommendations,
            gapCrusherProject, // [NEW]
            aiReasoning,
            timestamp: new Date().toISOString()
        };

        // 7. Save to DB
        // Determine a "score" based on verified vs total (simple metric)
        const gapScore = Math.round((verified.length / (claims.length || 1)) * 100);
        await this.profileRepo.updateGrowthHistory(username, 'resume_gap_analysis', gapScore, analysis, true);

        return analysis;
    }

    /**
     * Fetch GitHub evidence
     */
    private async fetchGitHubEvidence(username: string, token: string): Promise<GitHubEvidence> {
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: token });

        try {
            const { data: repos } = await octokit.repos.listForUser({
                username,
                per_page: 100
            });

            const projects = repos.map(repo => ({
                name: repo.name,
                description: repo.description || '',
                language: repo.language || '',
                topics: repo.topics || []
            }));

            return { projects };
        } catch (error) {
            Logger.error('[ResumeGap] Failed to fetch GitHub data:', error);
            return { projects: [] };
        }
    }

    /**
     * Find evidence for a specific skill
     */
    private findEvidence(
        skill: string,
        githubEvidence: GitHubEvidence
    ): { strength: 'strong' | 'weak' | 'none'; description: string; projects: string[] } {
        const matchingProjects = githubEvidence.projects.filter(project => {
            const searchText = `${project.name} ${project.description} ${project.language} ${project.topics.join(' ')}`.toLowerCase();
            return searchText.includes(skill);
        });

        if (matchingProjects.length >= 3) {
            return {
                strength: 'strong',
                description: `${matchingProjects.length} projects using ${skill}`,
                projects: matchingProjects.map(p => p.name)
            };
        } else if (matchingProjects.length >= 1) {
            return {
                strength: 'weak',
                description: `Only ${matchingProjects.length} project(s) with ${skill}`,
                projects: matchingProjects.map(p => p.name)
            };
        } else {
            return {
                strength: 'none',
                description: 'No projects found',
                projects: []
            };
        }
    }

    /**
     * Generate proof suggestion for a skill gap
     */
    private async generateProofSuggestion(
        skill: string,
        existingProjects: string[],
        type: 'new' | 'enhance'
    ): Promise<ProofSuggestion> {
        if (type === 'enhance' && existingProjects.length > 0) {
            return {
                option1: {
                    type: 'enhance-existing',
                    title: `Add ${skill} to '${existingProjects[0]}'`,
                    description: `Enhance your existing project with ${skill} implementation`,
                    estimatedTime: '2-4 days',
                    proofChecklist: [
                        `Implement core ${skill} functionality`,
                        `Add tests for ${skill} features`,
                        `Document ${skill} usage in README`,
                        `Add code examples`
                    ]
                },
                option2: {
                    type: 'new-project',
                    title: `Build ${skill}-focused project`,
                    description: `Create a dedicated project showcasing ${skill}`,
                    estimatedTime: '1-2 weeks',
                    proofChecklist: [
                        `Core ${skill} implementation`,
                        `Production-ready code`,
                        `Comprehensive README`,
                        `Live demo or screenshots`
                    ]
                }
            };
        } else {
            // Use Brain to generate creative project idea
            const projectIdea = await this.brain.generateRecommendations(
                {
                    experienceLevel: 'Intermediate',
                    domains: [skill],
                    strengths: [],
                    gaps: [skill]
                },
                [skill]
            );

            const idea = projectIdea[0] || {
                title: `${skill} Demo Application`,
                description: `Build an application demonstrating ${skill} skills`,
                techStack: [skill],
                difficulty: 'Intermediate' as const,
                estimatedTime: '1-2 weeks'
            };

            return {
                option1: {
                    type: 'new-project',
                    title: idea.title,
                    description: idea.description,
                    estimatedTime: idea.estimatedTime,
                    proofChecklist: [
                        `Implement core ${skill} features`,
                        `Add unit tests`,
                        `Write detailed README`,
                        `Deploy to production (if applicable)`
                    ]
                },
                option2: existingProjects.length > 0 ? {
                    type: 'enhance-existing',
                    title: `Integrate ${skill} into '${existingProjects[0]}'`,
                    description: `Add ${skill} capabilities to existing project`,
                    estimatedTime: '3-5 days',
                    proofChecklist: [
                        `${skill} integration`,
                        `Tests and documentation`,
                        `Update README with examples`
                    ]
                } : {
                    type: 'new-project',
                    title: `${skill} Practice Repository`,
                    description: `Create practice projects for ${skill}`,
                    estimatedTime: '1 week',
                    proofChecklist: [
                        `Multiple ${skill} examples`,
                        `Code comments`,
                        `README with learning notes`
                    ]
                }
            };
        }
    }

    /**
     * Generate final recommendations
     */
    private generateRecommendations(
        weakEvidence: GapAnalysis[],
        noEvidence: GapAnalysis[]
    ): Recommendations {
        const quickWins: string[] = [];
        const longTerm: string[] = [];
        const priorityOrder: string[] = [];

        // Quick wins: enhance existing projects with weak evidence
        weakEvidence.forEach(gap => {
            if (gap.proofSuggestion.option1.type === 'enhance-existing') {
                quickWins.push(`${gap.proofSuggestion.option1.title} (${gap.proofSuggestion.option1.estimatedTime})`);
            }
        });

        // Long term: build new projects for skills with no evidence
        noEvidence.forEach(gap => {
            longTerm.push(`${gap.proofSuggestion.option1.title} (${gap.proofSuggestion.option1.estimatedTime})`);
        });

        // Priority: critical gaps first
        priorityOrder.push(...noEvidence.map(g => g.skill));
        priorityOrder.push(...weakEvidence.map(g => g.skill));

        return {
            quickWins: quickWins.length > 0 ? quickWins : ['No quick wins identified - focus on building new projects'],
            longTerm: longTerm.length > 0 ? longTerm : ['Continue building diverse projects'],
            priorityOrder
        };
    }
    /**
     * Generate "Gap Crusher" Project
     */
    async generateGapCrusherProject(
        missingSkills: string[],
        experienceLevel: string
    ): Promise<any> {
        if (missingSkills.length === 0) return null;

        const targetSkills = missingSkills.slice(0, 4); // Focus on top 4 gaps
        const prompt = `Design a unique, "Gap Crusher" coding project to master these specific skills: ${targetSkills.join(', ')}.
        
        Context:
        - Target Level: ${experienceLevel}
        - Goal: Build a portfolio-worthy project that proves competence in these missing areas.
        - Constraint: Must be a cohesive application, not just a random collection of features.
        
        Return JSON:
        {
            "title": "Creative Project Title",
            "description": "Compelling 2-sentence pitch.",
            "techStack": ["List of technologies including target skills"],
            "difficulty": "Intermediate|Advanced",
            "estimatedTime": "2 weeks",
            "features": ["Feature 1", "Feature 2"],
            "learningOutcomes": ["Outcome 1", "Outcome 2"]
        }`;

        let projectIdea = null;
        try {
            projectIdea = await this.brain.generateInsights(prompt, 600, 0.5);
        } catch (error) {
            Logger.warn('[ResumeGap] Gap Crusher generation failed:', error);
            // No fallback, return null
            return null;
        }

        return projectIdea;
    }
}

// Types
interface ResumeGapAnalysis {
    summary: {
        totalClaims: number;
        verified: number;
        weakEvidence: number;
        noEvidence: number;
    };
    criticalGaps: GapAnalysis[];
    weakEvidence: GapAnalysis[];
    recommendations: Recommendations;
    gapCrusherProject?: any;
    aiReasoning?: string;
    timestamp: string;
}

interface GapAnalysis {
    skill: string;
    resumeClaim: string;
    currentEvidence: string;
    severity: 'high' | 'medium';
    reason: string;
    proofSuggestion: ProofSuggestion;
}

interface ProofSuggestion {
    option1: ProofOption;
    option2: ProofOption;
}

interface ProofOption {
    type: 'new-project' | 'enhance-existing';
    title: string;
    description: string;
    estimatedTime: string;
    proofChecklist: string[];
}

interface Recommendations {
    quickWins: string[];
    longTerm: string[];
    priorityOrder: string[];
}

interface GitHubEvidence {
    projects: Array<{
        name: string;
        description: string;
        language: string;
        topics: string[];
    }>;
}
