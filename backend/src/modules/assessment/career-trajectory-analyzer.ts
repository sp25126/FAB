import { BrainAnalyzer } from './brain-analyzer';
import { Logger } from '../logger';
import { ProfileRepository } from '../profile/repository';

/**
 * Career Trajectory Analyzer
 * Analyzes development journey over time through repository history
 */
export class CareerTrajectoryAnalyzer {
    private brain: BrainAnalyzer;
    private profileRepo: ProfileRepository;

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brain = new BrainAnalyzer(brainType);
        this.profileRepo = new ProfileRepository();
    }
    /**
     * Analyze career trajectory
     */
    async analyzeTrajectory(
        username: string,
        githubToken: string,
        timeRange: string = 'all',
        forceRefresh: boolean = false
    ): Promise<CareerTrajectoryReport> {
        Logger.info(`[CareerTrajectory] Analyzing ${username}'s development journey (Force Refresh: ${forceRefresh})`);

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: githubToken });

        try {
            // 1. Check Stored Analysis (Skip if forceRefresh)
            if (!forceRefresh) {
                try {
                    const history = await this.profileRepo.getGrowthHistory(username);
                    const trajectoryEntry = history.find(h => h.metric === 'career_trajectory');
                    if (trajectoryEntry) {
                        const report = trajectoryEntry.details;
                        // Return only if report looks valid
                        if (report && report.timeline) {
                            Logger.info(`[CareerTrajectory] Returning stored trajectory for ${username}`);
                            return report;
                        }
                    }
                } catch (ignore) {
                    // cache miss
                }
            }

            // Fetch all repositories with timestamps
            const repos = await this.fetchAllRepos(octokit, username);

            // Sort by creation date
            repos.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            // Analyze timeline
            const timeline = this.analyzeTimeline(repos);

            // Track skill evolution
            const skillEvolution = this.trackSkillEvolution(repos);

            // Detect domain shifts
            const domainShifts = this.detectDomainShifts(skillEvolution);

            // Calculate growth curve
            const growthCurve = this.calculateGrowthCurve(skillEvolution);

            // 5. Industry comparison (simplified)
            const industryComparison = this.compareWithIndustry(repos.length, timeline.totalDuration);

            // 6. AI-Powered Deep Insights
            const aiInsights = await this.generateAIInsights(username, timeline, skillEvolution, growthCurve);

            // Generate narrative using Brain
            let narrative = '';
            try {
                // Extract unique skills from skillEvolution for the prompt
                const allSkills = new Set<string>();
                skillEvolution.forEach(period => period.dominantSkills.forEach(skill => allSkills.add(skill)));
                const skillSet = Array.from(allSkills).join(', ');

                const narrativePrompt = `Analyze this career trajectory based on GitHub activity:
                - Start Date: ${timeline.startDate}
                - Duration: ${timeline.totalDuration}
                - Languages/Skills: ${skillSet}
                - Growth Trend: ${growthCurve.averageComplexityGrowth}
                
                Write a 2-sentence career narrative describing the developer's journey and growth momentum. Focus on the "story" of their code.`;

                const narrativeResult = await this.brain.generateInsights(narrativePrompt, 500, 0.4);
                if (narrativeResult && narrativeResult.reasoning) {
                    narrative = narrativeResult.reasoning;
                }
            } catch (error) {
                Logger.warn('[CareerTrajectory] AI narrative generation failed, using fallback:', error);
            }

            const report: CareerTrajectoryReport = {
                timeline,
                skillEvolution,
                growthCurve,
                domainShifts,
                predictions: aiInsights.predictions,
                industryComparison,
                aiSummary: aiInsights.summary,
                narrative, // [NEW] - AI Generated Story
                timestamp: new Date().toISOString()
            };

            // Save to DB
            const growthValue = parseInt(growthCurve.averageComplexityGrowth.replace(/[^0-9]/g, '')) || 0;
            await this.profileRepo.updateGrowthHistory(username, 'career_trajectory', growthValue, report, true);

            return report;
        } catch (error) {
            Logger.error('[CareerTrajectory] Analysis failed:', error);
            throw error;
        }
    }

    /**
     * Fetch all repositories
     */
    private async fetchAllRepos(octokit: any, username: string): Promise<Repository[]> {
        try {
            const { data: repos } = await octokit.repos.listForUser({
                username,
                per_page: 100,
                sort: 'created'
            });

            return repos.map((repo: any) => ({
                name: repo.name,
                created_at: repo.created_at,
                updated_at: repo.updated_at,
                language: repo.language || 'Unknown',
                topics: repo.topics || [],
                stars: repo.stargazers_count,
                size: repo.size
            }));
        } catch (error) {
            Logger.error('[CareerTrajectory] Failed to fetch repos:', error);
            return [];
        }
    }

    /**
     * Analyze timeline
     */
    private analyzeTimeline(repos: Repository[]): Timeline {
        if (repos.length === 0) {
            return {
                startDate: new Date().toISOString(),
                currentDate: new Date().toISOString(),
                totalDuration: '0 days'
            };
        }

        const startDate = new Date(repos[0].created_at);
        const currentDate = new Date();
        const duration = this.calculateDuration(startDate, currentDate);

        return {
            startDate: startDate.toISOString(),
            currentDate: currentDate.toISOString(),
            totalDuration: duration
        };
    }

    /**
     * Track skill evolution over time
     */
    private trackSkillEvolution(repos: Repository[]): SkillPeriod[] {
        const periods: SkillPeriod[] = [];

        // Group repositories by quarter
        const quarters = this.groupByQuarter(repos);

        quarters.forEach((quarterRepos, quarterName) => {
            const skills = new Set<string>();
            let totalComplexity = 0;

            quarterRepos.forEach(repo => {
                skills.add(repo.language);
                repo.topics.forEach(topic => skills.add(topic));
                totalComplexity += this.estimateComplexity(repo);
            });

            const avgComplexity = quarterRepos.length > 0 ? totalComplexity / quarterRepos.length : 0;

            periods.push({
                period: quarterName,
                dominantSkills: Array.from(skills).slice(0, 5),
                complexity: Math.round(avgComplexity),
                projects: quarterRepos.length,
                description: this.describePhase(avgComplexity, quarterRepos.length)
            });
        });

        return periods;
    }

    /**
     * Group repositories by quarter
     */
    private groupByQuarter(repos: Repository[]): Map<string, Repository[]> {
        const quarters = new Map<string, Repository[]>();

        repos.forEach(repo => {
            const date = new Date(repo.created_at);
            const year = date.getFullYear();
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            const key = `${year} Q${quarter}`;

            if (!quarters.has(key)) {
                quarters.set(key, []);
            }
            quarters.get(key)!.push(repo);
        });

        return quarters;
    }

    /**
     * Estimate project complexity
     */
    private estimateComplexity(repo: Repository): number {
        let complexity = 20; // Base

        // Size factor
        if (repo.size > 10000) complexity += 40;
        else if (repo.size > 5000) complexity += 30;
        else if (repo.size > 1000) complexity += 20;

        // Popularity factor
        if (repo.stars > 50) complexity += 20;
        else if (repo.stars > 10) complexity += 10;

        // Tech stack factor
        if (repo.topics.length > 5) complexity += 10;

        return Math.min(100, complexity);
    }

    /**
     * Describe development phase
     */
    private describePhase(complexity: number, projectCount: number): string {
        if (complexity < 30 && projectCount <= 2) {
            return 'Learning fundamentals';
        } else if (complexity < 50) {
            return 'Building foundational skills';
        } else if (complexity < 70) {
            return 'Intermediate development';
        } else {
            return 'Advanced/production-level work';
        }
    }

    /**
     * Detect domain shifts
     */
    private detectDomainShifts(skillEvolution: SkillPeriod[]): DomainShift[] {
        const shifts: DomainShift[] = [];

        for (let i = 1; i < skillEvolution.length; i++) {
            const prev = skillEvolution[i - 1];
            const curr = skillEvolution[i];

            const prevDomain = this.identifyDomain(prev.dominantSkills);
            const currDomain = this.identifyDomain(curr.dominantSkills);

            if (prevDomain !== currDomain) {
                shifts.push({
                    period: curr.period,
                    from: prevDomain,
                    to: currDomain,
                    trigger: `Transition to ${currDomain}-focused projects`
                });
            }
        }

        return shifts;
    }

    /**
     * Identify domain from skills
     */
    private identifyDomain(skills: string[]): string {
        const skillsLower = skills.map(s => s.toLowerCase()).join(' ');

        if (/(react|vue|angular|frontend|html|css)/.test(skillsLower)) {
            return 'Frontend development';
        } else if (/(node|express|django|flask|backend|api)/.test(skillsLower)) {
            return 'Backend development';
        } else if (/(react|node|express|django)/.test(skillsLower) && skills.length > 3) {
            return 'Full-stack development';
        } else if (/(ml|ai|tensorflow|pytorch|data)/.test(skillsLower)) {
            return 'Machine Learning/AI';
        } else if (/(devops|docker|kubernetes|ci)/.test(skillsLower)) {
            return 'DevOps/Infrastructure';
        } else {
            return 'General development';
        }
    }

    /**
     * Calculate growth curve
     */
    private calculateGrowthCurve(skillEvolution: SkillPeriod[]): GrowthCurve {
        if (skillEvolution.length < 2) {
            return {
                type: 'Insufficient data',
                averageComplexityGrowth: '+0%/year',
                currentTrajectory: 'Unknown'
            };
        }

        const first = skillEvolution[0];
        const last = skillEvolution[skillEvolution.length - 1];

        const growth = last.complexity - first.complexity;
        const years = skillEvolution.length / 4; // Approximate years
        const growthPerYear = years > 0 ? (growth / years) : 0;

        let type = 'Steady growth';
        if (growth > 50) type = 'Steep growth';
        else if (growth < 10) type = 'Plateau';

        return {
            type,
            averageComplexityGrowth: `+${Math.round(growthPerYear)}%/year`,
            currentTrajectory: last.complexity > 70 ? 'Advanced' : last.complexity > 50 ? 'Intermediate' : 'Junior'
        };
    }

    /**
     * Generate predictions
     */
    private generatePredictions(skillEvolution: SkillPeriod[], growthCurve: GrowthCurve): Predictions {
        const latestSkills = skillEvolution[skillEvolution.length - 1]?.dominantSkills || [];
        const currentDomain = this.identifyDomain(latestSkills);

        let nextSkills: string[] = [];
        let recommendedFocus = '';

        if (currentDomain === 'Frontend development') {
            nextSkills = ['Backend APIs', 'Database design', 'DevOps basics'];
            recommendedFocus = 'Expand to full-stack capabilities';
        } else if (currentDomain === 'Backend development') {
            nextSkills = ['System design', 'Microservices', 'Cloud architecture'];
            recommendedFocus = 'Deepen backend and infrastructure knowledge';
        } else if (currentDomain === 'Full-stack development') {
            nextSkills = ['System design', 'Performance optimization', 'Cloud platforms'];
            recommendedFocus = 'Focus on scalability and architecture';
        } else {
            nextSkills = ['Specialize in a domain', 'Build production projects'];
            recommendedFocus = 'Choose a specialization path';
        }

        return {
            nextSkills,
            recommendedFocus,
            estimatedSeniorReadiness: growthCurve.currentTrajectory === 'Advanced'
                ? '6-12 months with focused effort'
                : '12-24 months with consistent growth'
        };
    }

    /**
     * Compare with industry standards
     */
    private compareWithIndustry(totalRepos: number, duration: string): IndustryComparison {
        // Simplified industry benchmark
        const years = parseInt(duration.split(' ')[0]) || 1;
        const reposPerYear = totalRepos / Math.max(years, 1);

        let percentile = 50;
        if (reposPerYear > 20) percentile = 85;
        else if (reposPerYear > 10) percentile = 70;
        else if (reposPerYear > 5) percentile = 55;
        else percentile = 40;

        return {
            percentile,
            interpretation: percentile > 70
                ? 'Above average for experience level'
                : percentile > 50
                    ? 'Average for experience level'
                    : 'Below average - increase project frequency',
            recommendation: percentile < 60
                ? 'Build more projects to demonstrate consistent growth'
                : 'Consider contributing to open source for visibility'
        };
    }

    /**
     * Generate deep insights using AI
     */
    private async generateAIInsights(
        username: string,
        timeline: Timeline,
        skillEvolution: SkillPeriod[],
        growthCurve: GrowthCurve
    ): Promise<{ summary: string; predictions: Predictions }> {
        const historyText = skillEvolution.map(p =>
            `${p.period}: ${p.projects} projects, skills: ${p.dominantSkills.join(', ')}, complexity: ${p.complexity}/100 - ${p.description}`
        ).join('\n');

        const prompt = `Analyze the career trajectory of developer ${username}:
        
        TIMELINE: Started ${timeline.startDate}, Active for ${timeline.totalDuration}
        HISTORY:
        ${historyText}
        
        GROWTH: ${growthCurve.type}, Trajectory: ${growthCurve.currentTrajectory}
        
        Provide a JSON response with:
        {
          "summary": "A 2-3 sentence professional summary of their growth",
          "predictions": {
            "nextSkills": ["array of 3 skills to learn next"],
            "recommendedFocus": "one high-level recommendation",
            "estimatedSeniorReadiness": "timeline hint"
          }
        }`;

        try {
            const parsed = await this.brain.generateInsights(prompt, 800, 0.3);

            return {
                summary: parsed.summary || 'Developing consistent growth patterns.',
                predictions: parsed.predictions || {
                    nextSkills: ['Advanced design patterns', 'Cloud infrastructure', 'System scalability'],
                    recommendedFocus: 'Deepen core architecture knowledge',
                    estimatedSeniorReadiness: '12-18 months of production experience recommended'
                }
            };
        } catch (e) {
            return {
                summary: 'Consistent developer journey with visible progress in core domains.',
                predictions: this.generatePredictions(skillEvolution, growthCurve) // Fallback
            };
        }
    }

    /**
     * Helper: Extract JSON from LLM response
     */

    /**
     * Calculate duration between dates
     */
    private calculateDuration(start: Date, end: Date): string {
        const years = end.getFullYear() - start.getFullYear();
        const months = (end.getMonth() - start.getMonth() + 12) % 12;

        if (years > 0) {
            return `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
        } else {
            return `${months} month${months !== 1 ? 's' : ''}`;
        }
    }
}

// Types
interface Repository {
    name: string;
    created_at: string;
    updated_at: string;
    language: string;
    topics: string[];
    stars: number;
    size: number;
}

interface CareerTrajectoryReport {
    timeline: Timeline;
    skillEvolution: SkillPeriod[];
    growthCurve: GrowthCurve;
    domainShifts: DomainShift[];
    predictions: Predictions;
    industryComparison: IndustryComparison;
    aiSummary?: string;
    narrative?: string;
    timestamp: string;
}

interface Timeline {
    startDate: string;
    currentDate: string;
    totalDuration: string;
}

interface SkillPeriod {
    period: string;
    dominantSkills: string[];
    complexity: number;
    projects: number;
    description: string;
}

interface DomainShift {
    period: string;
    from: string;
    to: string;
    trigger: string;
}

interface GrowthCurve {
    type: string;
    averageComplexityGrowth: string;
    currentTrajectory: string;
}

interface Predictions {
    nextSkills: string[];
    recommendedFocus: string;
    estimatedSeniorReadiness: string;
}

interface IndustryComparison {
    percentile: number;
    interpretation: string;
    recommendation: string;
}
