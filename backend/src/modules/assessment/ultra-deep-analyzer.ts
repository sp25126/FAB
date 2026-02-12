import { BrainAnalyzer } from './brain-analyzer';
import { Logger } from '../logger';
import type { LLMProvider } from '../llm/types';
import { ProfileRepository } from '../profile/repository';
import { GitHubUtils } from '../../utils/github';

/**
 * Ultra-Deep Project Analyzer
 * Performs comprehensive analysis of a single GitHub project with ALL files
 */
export class UltraDeepAnalyzer {
    private brain: BrainAnalyzer;
    private profileRepo: ProfileRepository;

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brain = new BrainAnalyzer(brainType);
        this.profileRepo = new ProfileRepository();
    }

    /**
     * Perform ultra-deep analysis of a specific project
     */
    async analyzeProject(
        username: string,
        projectName: string,
        githubToken: string,
        forceRefresh: boolean = false
    ): Promise<UltraDeepAnalysis> {
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: githubToken });

        try {
            // 0. Resolve coordinates
            const { owner, repo: repoName } = GitHubUtils.resolveProjectCoordinates(projectName, username);
            Logger.info(`[UltraDeep] Starting comprehensive analysis of ${owner}/${repoName} (Force Refresh: ${forceRefresh})`);

            // 1. Check Stored Analysis (Skip if forceRefresh)
            if (!forceRefresh) {
                const storedProject = await this.profileRepo.getProject(owner, repoName);
                if (storedProject) {
                    const roadmap = JSON.parse(storedProject.roadmap || '{}');
                    if (roadmap.ultraDeepAnalysis) {
                        // Check age? For now, just return specific if exists
                        Logger.info(`[UltraDeep] Returning stored analysis for ${repoName}`);
                        return roadmap.ultraDeepAnalysis;
                    }
                }
            }

            // 2. Fetch repository metadata
            const { data: repo } = await octokit.repos.get({
                owner,
                repo: repoName
            });

            // 3. Fetch ALL files from the repository
            const allFiles = await this.fetchAllFiles(octokit, owner, repoName, repo.default_branch);
            Logger.info(`[UltraDeep] Fetched ${allFiles.length} files from ${repoName}`);

            // 4. Categorize files
            const categorized = this.categorizeFiles(allFiles);

            // 5. Run Analyses (Parallel where possible)
            const [architecture, codeQuality, security, performance] = await Promise.all([
                this.analyzeArchitecture(repo.name, categorized, allFiles),
                this.analyzeCodeQuality(categorized.codeFiles),
                this.analyzeSecurityWithBrain(categorized),
                this.analyzePerformance(categorized.codeFiles)
            ]);

            // 6. Synchronous/Simple analyses
            const testing = this.analyzeTestCoverage(categorized);
            const documentation = this.analyzeDocumentation(categorized);

            const analysis: UltraDeepAnalysis = {
                project: {
                    name: repo.name,
                    owner,
                    description: repo.description || '',
                    url: repo.html_url,
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language || 'Unknown',
                    totalFiles: allFiles.length,
                    totalLines: categorized.totalLines
                },
                architecture,
                codeQuality,
                security,
                performance,
                testing,
                documentation,
                timestamp: new Date().toISOString()
            };

            // 7. Save to Database
            await this.profileRepo.saveProjectAnalysis(owner, repoName, 'ultraDeepAnalysis', analysis);

            return analysis;
        } catch (error: any) {
            if (error.status === 404) {
                throw { status: 404, message: `Repository '${projectName}' not found. Verify the URL is correct and your GitHub token has 'repo' scope for private repositories.` };
            }
            Logger.error('[UltraDeep] Analysis failed:', error);
            throw error;
        }
    }

    /**
     * Fetch ALL files from repository recursively
     */
    private async fetchAllFiles(
        octokit: any,
        owner: string,
        repo: string,
        branch: string
    ): Promise<FileContent[]> {
        const files: FileContent[] = [];

        try {
            // Get repository tree recursively
            const { data: tree } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: '1'
            });

            // Filter for actual files (not directories)
            const fileItems = tree.tree.filter((item: any) => item.type === 'blob');

            // Limit to prevent overload (max 200 files for ultra-deep)
            const limitedFiles = fileItems.slice(0, 200);

            // Fetch each file's content
            for (const item of limitedFiles) {
                try {
                    const { data: fileData } = await octokit.repos.getContent({
                        owner,
                        repo,
                        path: item.path
                    });

                    if ('content' in fileData) {
                        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                        files.push({
                            path: item.path,
                            content,
                            size: item.size || 0
                        });
                    }
                } catch (e) {
                    // Skip files that can't be fetched (binary, too large, etc.)
                    Logger.warn(`[UltraDeep] Skipping file ${item.path}`);
                }
            }
        } catch (error) {
            Logger.error('[UltraDeep] Failed to fetch files:', error);
            throw error;
        }

        return files;
    }

    /**
     * Categorize files by type
     */
    private categorizeFiles(files: FileContent[]): CategorizedFiles {
        const codeFiles: FileContent[] = [];
        const testFiles: FileContent[] = [];
        const configFiles: FileContent[] = [];
        const docFiles: FileContent[] = [];
        let totalLines = 0;

        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.java', '.cs', '.php', '.c', '.cpp', '.swift', '.kt', '.rb'];
        const testPatterns = ['.test.', '.spec.', '__tests__', '/tests/', 'test_'];
        const configPatterns = ['config', '.json', '.yml', '.yaml', '.toml', '.env', 'dockerfile'];
        const docPatterns = ['.md', '.txt', 'README', 'CONTRIBUTING', 'LICENSE', 'docs/'];

        files.forEach(file => {
            const lines = file.content.split('\n').length;
            totalLines += lines;

            const path = file.path.toLowerCase();

            if (testPatterns.some(pattern => path.includes(pattern))) {
                testFiles.push(file);
            } else if (codeExtensions.some(ext => path.endsWith(ext))) {
                codeFiles.push(file);
            } else if (configPatterns.some(pattern => path.includes(pattern))) {
                configFiles.push(file);
            } else if (docPatterns.some(pattern => path.includes(pattern))) {
                docFiles.push(file);
            }
        });

        return {
            codeFiles,
            testFiles,
            configFiles,
            docFiles,
            totalLines
        };
    }

    /**
     * Analyze project architecture using Brain
     */
    private async analyzeArchitecture(
        projectName: string,
        categorized: CategorizedFiles,
        allFiles: FileContent[]
    ): Promise<ArchitectureAnalysis> {
        // Get file structure overview
        const fileStructure = allFiles.map(f => f.path).join('\n');

        // Sample key code files for analysis
        const keyFiles = categorized.codeFiles.slice(0, 10).map(f =>
            `File: ${f.path}\n${f.content.slice(0, 1000)}\n...`
        ).join('\n\n');

        const prompt = `Analyze the architecture of this project deeply:

PROJECT: ${projectName}

FILE STRUCTURE:
${fileStructure.slice(0, 3000)}

KEY CODE SAMPLES:
${keyFiles.slice(0, 5000)}

Provide JSON:
{
  "pattern": "Architecture pattern (MVC, Microservices, Monolith, etc.)",
  "quality": "Architecture quality assessment",
  "structure": "Project structure description",
  "strengths": ["array of architectural strengths"],
  "weaknesses": ["array of architectural weaknesses"],
  "recommendations": ["array of improvement suggestions"],
  "reasoning": "Detailed explanation of WHY this architecture was chosen and its effectiveness in this context. 3-4 sentences."
}`;

        try {
            const parsed = await this.brain.generateInsights(prompt, 1000, 0.3);

            return {
                pattern: parsed.pattern || 'Unknown',
                quality: parsed.quality || 'Unable to assess',
                structure: parsed.structure || '',
                strengths: parsed.strengths || [],
                weaknesses: parsed.weaknesses || [],
                recommendations: parsed.recommendations || [],
                reasoning: parsed.reasoning || 'No detailed reasoning provided.'
            };
        } catch (error) {
            Logger.error('[UltraDeep] Architecture analysis failed:', error);
            return {
                pattern: 'Unable to determine',
                quality: 'Analysis failed',
                structure: 'Unable to analyze',
                strengths: [],
                weaknesses: [],
                recommendations: [],
                reasoning: 'Analysis failed.'
            };
        }
    }

    /**
     * Analyze code quality metrics
     */
    private async analyzeCodeQuality(codeFiles: FileContent[]): Promise<CodeQualityAnalysis> {
        let totalComplexity = 0;
        let filesAnalyzed = 0;
        const staticIssues: string[] = [];

        // 1. Static Analysis
        for (const file of codeFiles.slice(0, 50)) {
            const complexity = this.calculateComplexity(file.content);
            totalComplexity += complexity;
            filesAnalyzed++;

            if (complexity > 20) staticIssues.push(`High complexity in ${file.path} (${complexity})`);
        }

        const avgComplexity = filesAnalyzed > 0 ? totalComplexity / filesAnalyzed : 0;
        const baseScore = Math.max(0, Math.min(100, 100 - (avgComplexity * 4)));

        // 2. AI Analysis for Refactoring Suggestions
        const sampleFiles = codeFiles.slice(0, 5).map(f => `// ${f.path}\n${f.content.slice(0, 1500)}`);
        const prompt = `Analyze code quality and provide refactoring suggestions for these files:
        ${sampleFiles.join('\n\n')}
        
        Provide JSON:
        {
          "aiScore": number (0-100),
          "strengths": ["string"],
          "improvements": ["string"],
          "refactoringSuggestions": [{"file": "string", "suggestion": "string"}],
          "reasoning": "Detailed explanation of code quality assessment. 3-4 sentences."
        }`;

        try {
            const parsed = await this.brain.generateInsights(prompt, 1000, 0.2);

            return {
                score: Math.round((baseScore + (parsed.aiScore || baseScore)) / 2),
                grade: this.scoreToGrade((baseScore + (parsed.aiScore || baseScore)) / 2),
                averageComplexity: Math.round(avgComplexity * 10) / 10,
                filesAnalyzed,
                issues: [...staticIssues.slice(0, 5), ...(parsed.improvements || []).slice(0, 5)],
                strengths: parsed.strengths || [],
                improvements: parsed.improvements || [],
                refactoringSuggestions: parsed.refactoringSuggestions || [],
                reasoning: parsed.reasoning || 'No reasoning provided.'
            };
        } catch (e) {
            return {
                score: Math.round(baseScore),
                grade: this.scoreToGrade(baseScore),
                averageComplexity: Math.round(avgComplexity * 10) / 10,
                filesAnalyzed,
                issues: staticIssues.slice(0, 10),
                strengths: baseScore > 70 ? ['Clean code on average'] : [],
                improvements: ['Manual review recommended'],
                refactoringSuggestions: [],
                reasoning: 'Analysis failed.'
            };
        }
    }

    /**
     * Calculate cyclomatic complexity (simplified)
     */
    private calculateComplexity(code: string): number {
        const controlStructures = [
            /if\s*\(/g,
            /else\s+if/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /\?\s*.*\s*:/g // Ternary
        ];

        let complexity = 1; // Base complexity

        controlStructures.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) complexity += matches.length;
        });

        return complexity;
    }

    /**
     * Security analysis with Brain
     */
    private async analyzeSecurityWithBrain(categorized: CategorizedFiles): Promise<SecurityAnalysis> {
        const samples = categorized.codeFiles.slice(0, 10).map(f => `// ${f.path}\n${f.content.slice(0, 1000)}`);
        const configSamples = categorized.configFiles.slice(0, 5).map(f => `// ${f.path}\n${f.content}`);

        const prompt = `Analyze security vulnerabilities in this code:
        ${samples.join('\n\n')}
        ${configSamples.join('\n\n')}
        
        Look for: Hardcoded secrets, SQL injection, XSS, insecure dependencies, etc.
        Return JSON:
        {
          "score": number,
          "vulnerabilities": [{"file": "string", "line": number, "type": "string", "severity": "low|medium|high", "recommendation": "string"}],
          "recommendations": ["string"],
          "reasoning": "Detailed explanation of security posture. Why is it secure/insecure?"
        }`;

        try {
            const parsed = await this.brain.generateInsights(prompt, 600, 0.1);
            return {
                score: parsed.score || 100,
                vulnerabilities: parsed.vulnerabilities || [],
                recommendations: parsed.recommendations || ['No obvious security issues detected'],
                reasoning: parsed.reasoning || 'No reasoning provided.'
            };
        } catch (e) {
            return {
                score: 100,
                vulnerabilities: [],
                recommendations: ['Security analysis failed. Manual audit required.'],
                reasoning: 'Analysis failed.'
            };
        }
    }

    /**
     * Performance analysis
     */
    private async analyzePerformance(codeFiles: FileContent[]): Promise<PerformanceAnalysis> {
        const samples = codeFiles.slice(0, 8).map(f => `// ${f.path}\n${f.content.slice(0, 1500)}`);
        const prompt = `Analyze performance bottlenecks in this code:
        ${samples.join('\n\n')}
        
        Look for: Nested loops, inefficient async, slow queries, memory leaks, redundant complexity.
        Return JSON:
        {
          "score": number,
          "bottlenecks": ["string"],
          "optimizations": ["string"],
          "reasoning": "Detailed explanation of performance characteristics."
        }`;

        try {
            const parsed = await this.brain.generateInsights(prompt, 600, 0.1);
            return {
                score: parsed.score || 100,
                bottlenecks: parsed.bottlenecks || [],
                optimizations: parsed.optimizations || [],
                reasoning: parsed.reasoning || 'No reasoning provided.'
            };
        } catch (e) {
            return {
                score: 100,
                bottlenecks: [],
                optimizations: ['Performance analysis failed. Manual performance profiles recommended.'],
                reasoning: 'Analysis failed.'
            };
        }
    }

    /**
     * Test coverage analysis
     */
    private analyzeTestCoverage(categorized: CategorizedFiles): TestingAnalysis {
        const totalCode = categorized.codeFiles.length;
        const totalTests = categorized.testFiles.length;

        const coverageEstimate = totalCode > 0 ? Math.min(100, (totalTests / totalCode) * 100) : 0;

        return {
            testFiles: totalTests,
            codeFiles: totalCode,
            coverageEstimate: Math.round(coverageEstimate),
            recommendations: coverageEstimate < 50
                ? ['Increase test coverage', 'Add unit tests for critical functions', 'Consider integration tests']
                : ['Maintain current test coverage', 'Add edge case tests']
        };
    }

    /**
     * Documentation analysis
     */
    private analyzeDocumentation(categorized: CategorizedFiles): DocumentationAnalysis {
        const hasReadme = categorized.docFiles.some(f => f.path.toLowerCase().includes('readme'));
        const hasContributing = categorized.docFiles.some(f => f.path.toLowerCase().includes('contributing'));
        const hasLicense = categorized.docFiles.some(f => f.path.toLowerCase().includes('license'));

        const quality = [hasReadme, hasContributing, hasLicense].filter(Boolean).length;

        return {
            quality: quality >= 2 ? 'Good' : quality === 1 ? 'Fair' : 'Poor',
            files: categorized.docFiles.length,
            hasReadme,
            hasContributing,
            hasLicense,
            missingDocs: [
                !hasReadme && 'README.md',
                !hasContributing && 'CONTRIBUTING.md',
                !hasLicense && 'LICENSE'
            ].filter(Boolean) as string[]
        };
    }


    /**
     * Helper: Convert score to grade
     */
    private scoreToGrade(score: number): string {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
}

// Types
interface FileContent {
    path: string;
    content: string;
    size: number;
}

interface CategorizedFiles {
    codeFiles: FileContent[];
    testFiles: FileContent[];
    configFiles: FileContent[];
    docFiles: FileContent[];
    totalLines: number;
}

interface UltraDeepAnalysis {
    project: {
        name: string;
        owner: string;
        description: string;
        url: string;
        stars: number;
        forks: number;
        language: string;
        totalFiles: number;
        totalLines: number;
    };
    architecture: ArchitectureAnalysis;
    codeQuality: CodeQualityAnalysis;
    security: SecurityAnalysis;
    performance: PerformanceAnalysis;
    testing: TestingAnalysis;
    documentation: DocumentationAnalysis;
    timestamp: string;
}

interface ArchitectureAnalysis {
    pattern: string;
    quality: string;
    structure: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    reasoning: string;
}

interface CodeQualityAnalysis {
    score: number;
    grade: string;
    averageComplexity: number;
    filesAnalyzed: number;
    issues: string[];
    strengths: string[];
    improvements: string[];
    refactoringSuggestions?: Array<{ file: string; suggestion: string }>;
    reasoning: string;
}

interface SecurityAnalysis {
    vulnerabilities: Array<{
        file: string;
        line: number;
        type: string;
        severity: string;
    }>;
    recommendations: string[];
    score: number;
    reasoning: string;
}

interface PerformanceAnalysis {
    bottlenecks: string[];
    optimizations: string[];
    score: number;
    reasoning: string;
}

interface TestingAnalysis {
    testFiles: number;
    codeFiles: number;
    coverageEstimate: number;
    recommendations: string[];
}

interface DocumentationAnalysis {
    quality: string;
    files: number;
    hasReadme: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    missingDocs: string[];
}
