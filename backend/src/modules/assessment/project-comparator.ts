import { BrainAnalyzer } from './brain-analyzer';
import { Logger } from '../logger';

/**
 * Project Comparator
 * Compares own projects or benchmarks against external GitHub repos
 */
import { ProfileRepository } from '../profile/repository';
import { GitHubUtils } from '../../utils/github';

export class ProjectComparator {
    private brain: BrainAnalyzer;
    private profileRepo: ProfileRepository;

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brain = new BrainAnalyzer(brainType);
        this.profileRepo = new ProfileRepository();
    }


    /**
     * Compare two of user's own projects
     */
    /**
     * Compare two of user's own projects
     */
    async compareOwnProjects(
        username: string,
        project1Name: string,
        project2Name: string,
        githubToken: string,
        forceRefresh: boolean = false
    ): Promise<ProjectComparison> {
        Logger.info(`[Comparator] Comparing ${project1Name} vs ${project2Name} (Force Refresh: ${forceRefresh})`);

        const p1Coords = GitHubUtils.resolveProjectCoordinates(project1Name, username);
        const p2Coords = GitHubUtils.resolveProjectCoordinates(project2Name, username);

        const [project1, project2] = await Promise.all([
            this.analyzeProject(p1Coords.owner, p1Coords.repo, githubToken, 'full', forceRefresh),
            this.analyzeProject(p2Coords.owner, p2Coords.repo, githubToken, 'full', forceRefresh)
        ]);

        const differences = this.calculateDifferences(project1, project2);
        const growthAnalysis = this.analyzeGrowth(project1, project2);

        const result: ProjectComparison = {
            project1,
            project2,
            differences,
            growthAnalysis,
            timestamp: new Date().toISOString()
        };

        // Persist comparison
        await this.profileRepo.updateGrowthHistory(username, `project_compare_${project1Name}_${project2Name}`, 0, result, true);

        return result;
    }

    /**
     * Compare user's project with external GitHub repo
     */
    async compareWithExternal(
        username: string,
        myProjectName: string,
        externalRepoUrl: string,
        githubToken: string,
        analysisDepth: 'light' | 'moderate' = 'moderate',
        forceRefresh: boolean = false
    ): Promise<ExternalComparison> {
        Logger.info(`[Comparator] Comparing ${myProjectName} with external repo ${externalRepoUrl} (Force Refresh: ${forceRefresh})`);

        // Parse external repo URL using shared utility
        const { owner, repo } = GitHubUtils.resolveProjectCoordinates(externalRepoUrl, 'external-user');

        const [myProject, externalProject] = await Promise.all([
            this.analyzeProject(username, myProjectName, githubToken, 'full', forceRefresh),
            this.analyzeProject(owner, repo, githubToken, analysisDepth, forceRefresh)
        ]);

        const differences = this.calculateDifferences(myProject, externalProject);
        const learningOpportunities = await this.identifyLearningOpportunities(myProject, externalProject);
        const recommendations = this.generateAdoptionRecommendations(differences, learningOpportunities);

        const result: ExternalComparison = {
            myProject,
            externalProject: {
                ...externalProject,
                type: 'external',
                analysisDepth
            },
            differences,
            learningOpportunities,
            recommendations,
            timestamp: new Date().toISOString()
        };

        // Persist comparison
        await this.profileRepo.updateGrowthHistory(username, `project_compare_external_${myProjectName}`, 0, result, true);

        return result;
    }

    /**
     * Analyze a single project
     */
    private async analyzeProject(
        owner: string,
        repoName: string,
        token: string,
        depth: 'light' | 'moderate' | 'full',
        forceRefresh: boolean = false
    ): Promise<ProjectAnalysis> {
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: token });

        try {
            const { data: repo } = await octokit.repos.get({ owner, repo: repoName });

            // 1. Try to fetch existing deep analysis from ProfileRepository
            // This is "First Priority" as requested
            if (!forceRefresh) {
                try {
                    const storedProjects = await this.profileRepo.getGitHubProjects(owner);
                    const existing = storedProjects.find(p => p.name === repo.name || p.name === repoName);

                    if (existing && existing.features && existing.features.length > 0) {
                        Logger.info(`[Comparator] Using stored deep analysis for ${repoName}`);
                        return {
                            name: repo.name,
                            owner,
                            description: repo.description || '',
                            url: repo.html_url,
                            stars: repo.stargazers_count,
                            forks: repo.forks_count,
                            language: repo.language || 'Unknown',
                            techStack: repo.topics || [],
                            complexity: this.mapComplexityToScore(existing.complexity || 'Intermediate'),
                            codeQuality: 80,
                            documentationScore: 80,
                            architecture: existing.architecture || 'Unknown',
                            analysis: {
                                ...existing,
                                architecturePatterns: existing.architecture ? [existing.architecture] : [],
                                codeQualityScore: 80,
                                realWorldUtility: 'Loaded from history',
                                advancedTechniques: [],
                                complexity: existing.complexity,
                                features: existing.features || []
                            },
                            features: existing.features || []
                        };
                    }
                } catch (ignore) {
                    // Fallback to fresh analysis
                }
            }

            // Fetch README
            let readme = '';
            try {
                const { data: readmeData } = await octokit.repos.getReadme({ owner, repo: repoName });
                readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
            } catch (e) {
                // No README
            }

            // Fetch code samples based on depth
            const codeFiles = await this.fetchCodeSamples(octokit, owner, repoName, repo.default_branch, depth);

            // Brain analysis
            // Brain analysis
            let brainAnalysis;
            try {
                brainAnalysis = await this.brain.analyzeGitHubProject(
                    repo.name,
                    repo.description || '',
                    readme.slice(0, 2000),
                    codeFiles.slice(0, depth === 'light' ? 4 : depth === 'moderate' ? 10 : 20)
                );
            } catch (error) {
                Logger.warn(`[Comparator] AI analysis failed for ${repo.name}`, error);
                throw error; // Propagate error instead of using fallback
            }

            return {
                name: repo.name,
                owner,
                description: repo.description || '',
                url: repo.html_url,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language || 'Unknown',
                techStack: repo.topics || [],
                complexity: this.mapComplexityToScore(brainAnalysis.complexity),
                codeQuality: brainAnalysis.codeQualityScore || 75,
                documentationScore: brainAnalysis.documentationScore || 50,
                architecture: brainAnalysis.architecturePatterns.join(', ') || 'Unknown',
                analysis: brainAnalysis,
                features: brainAnalysis.features || [],
                scoreReasoning: brainAnalysis.scoreReasoning
            };
        } catch (error: any) {
            if (error.status === 404) {
                throw { status: 404, message: `Repository '${owner}/${repoName}' not found. Verify the URL is correct and your GitHub token has 'repo' scope for private repositories.` };
            }
            throw error;
        }
    }

    /**
     * Fetch code samples based on depth
     */
    private async fetchCodeSamples(
        octokit: any,
        owner: string,
        repo: string,
        branch: string,
        depth: 'light' | 'moderate' | 'full'
    ): Promise<Array<{ path: string; content: string }>> {
        const limits = {
            light: 4,
            moderate: 10,
            full: 30
        };

        const maxFiles = limits[depth];
        const files: Array<{ path: string; content: string }> = [];

        try {
            const { data: tree } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: '1'
            });

            const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb'];
            const codeFiles = tree.tree.filter((item: any) =>
                item.type === 'blob' && codeExtensions.some(ext => item.path.endsWith(ext))
            ).slice(0, maxFiles);

            for (const file of codeFiles) {
                try {
                    const { data } = await octokit.repos.getContent({ owner, repo, path: file.path });
                    if ('content' in data) {
                        files.push({
                            path: file.path,
                            content: Buffer.from(data.content, 'base64').toString('utf-8').slice(0, 1000)
                        });
                    }
                } catch (e) {
                    // Skip problematic files
                }
            }
        } catch (error) {
            Logger.warn(`[Comparator] Failed to fetch code samples:`, error);
        }

        return files;
    }

    /**
     * Calculate differences between two projects
     */
    private calculateDifferences(project1: ProjectAnalysis, project2: ProjectAnalysis): Differences {
        return {
            complexity: {
                project1: project1.complexity,
                project2: project2.complexity,
                gap: project2.complexity - project1.complexity,
                interpretation: project2.complexity > project1.complexity
                    ? 'Project 2 shows more sophisticated patterns'
                    : 'Project 1 shows more sophisticated patterns'
            },
            techStack: {
                common: project1.techStack.filter(t => project2.techStack.includes(t)),
                project1Only: project1.techStack.filter(t => !project2.techStack.includes(t)),
                project2Only: project2.techStack.filter(t => !project1.techStack.includes(t))
            },
            features: {
                project1: project1.features || [],
                project2: project2.features || []
            },
            documentation: {
                project1: project1.documentationScore,
                project2: project2.documentationScore,
                gap: project2.documentationScore - project1.documentationScore
            },
            architecture: {
                project1: project1.architecture,
                project2: project2.architecture,
                comparison: this.compareArchitecture(project1.architecture, project2.architecture)
            },
            codeQuality: {
                project1: project1.codeQuality,
                project2: project2.codeQuality,
                keyDifferences: [
                    `Project 1: ${project1.codeQuality}/100`,
                    `Project 2: ${project2.codeQuality}/100`,
                    project2.codeQuality > project1.codeQuality
                        ? 'Project 2 has better code quality'
                        : 'Project 1 has better code quality'
                ]
            },
            engagement: {
                project1Stars: project1.stars,
                project2Stars: project2.stars,
                difference: Math.abs(project1.stars - project2.stars)
            }
        };
    }

    /**
     * Analyze growth between projects (for own projects)
     */
    private analyzeGrowth(project1: ProjectAnalysis, project2: ProjectAnalysis): GrowthAnalysis {
        const areasImproved: string[] = [];
        const areasRegressed: string[] = [];

        if (project2.complexity > project1.complexity) {
            areasImproved.push('Complexity/Sophistication');
        } else if (project1.complexity > project2.complexity) {
            areasRegressed.push('Complexity');
        }

        if (project2.codeQuality > project1.codeQuality) {
            areasImproved.push('Code Quality');
        } else if (project1.codeQuality > project2.codeQuality) {
            areasRegressed.push('Code Quality');
        }

        return {
            areasImproved,
            areasRegressed,
            recommendations: areasImproved.length > 0
                ? `Continue focus on ${areasImproved.join(', ')}`
                : 'Consider revisiting project fundamentals'
        };
    }

    /**
     * Identify learning opportunities from external project
     */
    private async identifyLearningOpportunities(
        myProject: ProjectAnalysis,
        externalProject: ProjectAnalysis
    ): Promise<LearningOpportunity[]> {
        const opportunities: LearningOpportunity[] = [];

        // Tech stack they use but I don't
        externalProject.techStack.forEach(tech => {
            if (!myProject.techStack.includes(tech)) {
                opportunities.push({
                    pattern: `${tech} usage`,
                    benefit: `Learn ${tech} to expand skillset`,
                    difficulty: 'Intermediate' as const,
                    applicability: 'Medium'
                });
            }
        });

        // Architecture patterns
        if (externalProject.complexity > myProject.complexity + 20) {
            opportunities.push({
                pattern: `Advanced architecture (${externalProject.architecture})`,
                benefit: 'Improve code organization and scalability',
                difficulty: 'Advanced' as const,
                applicability: 'High'
            });
        }

        // Code quality
        if (externalProject.codeQuality > myProject.codeQuality + 15) {
            opportunities.push({
                pattern: 'Code quality practices',
                benefit: 'Better maintainability and fewer bugs',
                difficulty: 'Intermediate' as const,
                applicability: 'High'
            });
        }

        return opportunities.slice(0, 5); // Top 5
    }

    /**
     * Generate recommendations for adopting patterns
     */
    private generateAdoptionRecommendations(
        differences: Differences,
        opportunities: LearningOpportunity[]
    ): AdoptionRecommendations {
        const quickWins: string[] = [];
        const mediumTerm: string[] = [];
        const aspirational: string[] = [];

        opportunities.forEach(opp => {
            if (opp.difficulty === 'Beginner') {
                quickWins.push(opp.pattern);
            } else if (opp.difficulty === 'Intermediate') {
                mediumTerm.push(opp.pattern);
            } else {
                aspirational.push(opp.pattern);
            }
        });

        return {
            quickWins: quickWins.length > 0 ? quickWins : ['Review their README structure'],
            mediumTerm: mediumTerm.length > 0 ? mediumTerm : ['Study their testing approach'],
            aspirational: aspirational.length > 0 ? aspirational : ['Analyze their full architecture']
        };
    }


    /**
     * Map complexity string to score
     */
    private mapComplexityToScore(complexity: string): number {
        switch (complexity.toLowerCase()) {
            case 'advanced': return 85;
            case 'intermediate': return 60;
            case 'beginner': return 35;
            default: return 50;
        }
    }

    private compareArchitecture(arch1: string, arch2: string): string {
        if (arch1 === arch2) return 'Identical architectural patterns.';
        if (arch1.includes('Microservices') && !arch2.includes('Microservices')) return 'Project 1 uses distributed architecture.';
        if (!arch1.includes('Microservices') && arch2.includes('Microservices')) return 'Project 2 uses distributed architecture.';
        return 'Distinct architectural approaches.';
    }
}

// Types
interface ProjectAnalysis {
    name: string;
    owner: string;
    description: string;
    url: string;
    stars: number;
    forks: number;
    language: string;
    techStack: string[];
    complexity: number;
    codeQuality: number;
    documentationScore: number;
    architecture: string;
    analysis: any;
    features: string[];
    scoreReasoning?: string;
}

interface ProjectComparison {
    project1: ProjectAnalysis;
    project2: ProjectAnalysis;
    differences: Differences;
    growthAnalysis: GrowthAnalysis;
    timestamp: string;
}

interface ExternalComparison {
    myProject: ProjectAnalysis;
    externalProject: ProjectAnalysis & { type: string; analysisDepth: string };
    differences: Differences;
    learningOpportunities: LearningOpportunity[];
    recommendations: AdoptionRecommendations;
    timestamp: string;
}

interface Differences {
    complexity: {
        project1: number;
        project2: number;
        gap: number;
        interpretation: string;
    };
    techStack: {
        common: string[];
        project1Only: string[];
        project2Only: string[];
    };
    features: {
        project1: string[];
        project2: string[];
    };
    documentation: {
        project1: number;
        project2: number;
        gap: number;
    };
    architecture: {
        project1: string;
        project2: string;
        comparison: string;
    };
    codeQuality: {
        project1: number;
        project2: number;
        keyDifferences: string[];
    };
    engagement: {
        project1Stars: number;
        project2Stars: number;
        difference: number;
    };
}

interface GrowthAnalysis {
    areasImproved: string[];
    areasRegressed: string[];
    recommendations: string;
}

interface LearningOpportunity {
    pattern: string;
    benefit: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    applicability: string;
}

interface AdoptionRecommendations {
    quickWins: string[];
    mediumTerm: string[];
    aspirational: string[];
}
