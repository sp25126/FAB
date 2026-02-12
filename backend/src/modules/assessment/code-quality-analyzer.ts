import { Logger } from '../logger';
import { BrainAnalyzer } from './brain-analyzer';
import { GitHubUtils } from '../../utils/github';
import { ProfileRepository } from '../profile/repository';

/**
 * Code Quality Analyzer
 * Performs deep code quality analysis including smells, anti-patterns, and refactoring suggestions
 */
export class CodeQualityAnalyzer {
    private brain: BrainAnalyzer;
    private profileRepo: ProfileRepository;

    constructor(brainType: 'local' | 'remote' = 'local') {
        this.brain = new BrainAnalyzer(brainType);
        this.profileRepo = new ProfileRepository();
    }
    /**
     * Analyze code quality of a project
     */
    async analyzeCodeQuality(
        username: string,
        projectName: string,
        githubToken: string,
        focusAreas?: string[],
        forceRefresh: boolean = false
    ): Promise<CodeQualityReport> {
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: githubToken });

        try {
            // 0. Resolve coordinates
            const { owner, repo: repoName } = GitHubUtils.resolveProjectCoordinates(projectName, username);
            Logger.info(`[CodeQuality] Analyzing ${owner}/${repoName} (Force Refresh: ${forceRefresh})`);

            // 1. Check Stored Analysis (Skip if forceRefresh)
            if (!forceRefresh) {
                try {
                    const storedProject = await this.profileRepo.getProject(owner, repoName);
                    if (storedProject) {
                        const roadmap = JSON.parse(storedProject.roadmap || '{}');
                        if (roadmap.codeQualityReport) {
                            Logger.info(`[CodeQuality] Returning stored analysis for ${repoName}`);
                            return roadmap.codeQualityReport;
                        }
                    }
                } catch (e) {
                    // Ignore cache read errors
                }
            }

            const { data: repo } = await octokit.repos.get({ owner, repo: repoName });
            const files = await this.fetchCodeFiles(octokit, owner, repoName, repo.default_branch);

            // Analyze various aspects
            const complexity = this.analyzeComplexity(files);
            const errorHandling = this.analyzeErrorHandling(files);
            const naming = this.analyzeNamingConventions(files);
            const documentation = this.analyzeDocumentation(files);
            const codeSmells = this.detectCodeSmells(files);
            const bestPractices = this.checkBestPractices(files);

            // AI-Powered Refactoring Suggestions
            const refactoringSuggestions = await this.generateAIRefactoringSuggestions(files, codeSmells);

            const overallScore = Math.round(
                (complexity.score * 0.3) +
                (errorHandling.score * 0.25) +
                (naming.score * 0.15) +
                (documentation.score * 0.15) +
                (bestPractices.score * 0.15)
            );

            const report: CodeQualityReport = {
                overallScore,
                grade: this.scoreToGrade(overallScore),
                summary: this.generateSummary(overallScore, complexity, errorHandling),
                metrics: {
                    complexity,
                    errorHandling,
                    naming,
                    documentation
                },
                codeSmells: codeSmells.slice(0, 10), // Top 10
                bestPractices,
                refactoringSuggestions: refactoringSuggestions.length > 0
                    ? refactoringSuggestions
                    : this.generateRefactoringSuggestions(codeSmells, complexity),
                timestamp: new Date().toISOString()
            };

            // Save to DB
            await this.profileRepo.saveProjectAnalysis(owner, repoName, 'codeQualityReport', report);

            return report;
        } catch (error: any) {
            if (error.status === 404) {
                throw { status: 404, message: `Repository '${projectName}' not found. Verify the URL is correct and your GitHub token has 'repo' scope for private repositories.` };
            }
            throw error;
        }
    }

    /**
     * Fetch code files from repository
     */
    private async fetchCodeFiles(
        octokit: any,
        owner: string,
        repo: string,
        branch: string
    ): Promise<CodeFile[]> {
        const files: CodeFile[] = [];

        try {
            const { data: tree } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: '1'
            });

            const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'];
            const codeItems = tree.tree.filter((item: any) =>
                item.type === 'blob' && codeExtensions.some(ext => item.path.endsWith(ext))
            ).slice(0, 100); // Limit to 100 files

            for (const item of codeItems) {
                try {
                    const { data } = await octokit.repos.getContent({ owner, repo, path: item.path });
                    if ('content' in data) {
                        files.push({
                            path: item.path,
                            content: Buffer.from(data.content, 'base64').toString('utf-8')
                        });
                    }
                } catch (e) {
                    // Skip
                }
            }
        } catch (error) {
            Logger.warn('[CodeQuality] Failed to fetch files:', error);
        }

        return files;
    }

    /**
     * Analyze cyclomatic complexity
     */
    private analyzeComplexity(files: CodeFile[]): ComplexityMetrics {
        const complexities: number[] = [];
        const highComplexityFiles: string[] = [];

        files.forEach(file => {
            const complexity = this.calculateFileComplexity(file.content);
            complexities.push(complexity);

            if (complexity > 15) {
                highComplexityFiles.push(`${file.path} (complexity: ${complexity})`);
            }
        });

        const average = complexities.reduce((a, b) => a + b, 0) / complexities.length;
        const score = Math.max(0, Math.min(100, 100 - (average * 5)));

        return {
            average: Math.round(average * 10) / 10,
            high: highComplexityFiles,
            recommendations: highComplexityFiles.length > 0
                ? 'Refactor complex functions into smaller, single-responsibility functions'
                : 'Complexity is well-managed',
            score: Math.round(score)
        };
    }

    /**
     * Calculate file complexity
     */
    private calculateFileComplexity(code: string): number {
        const patterns = [
            /if\s*\(/g,
            /else\s+if/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /\?\s*.*\s*:/g
        ];

        let complexity = 1;
        patterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) complexity += matches.length;
        });

        return complexity;
    }

    /**
     * Analyze error handling
     */
    private analyzeErrorHandling(files: CodeFile[]): ErrorHandlingMetrics {
        let totalFunctions = 0;
        let functionsWithErrorHandling = 0;
        const missing: string[] = [];

        files.forEach(file => {
            const functions = file.content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [];
            totalFunctions += functions.length;

            const tryCatchCount = (file.content.match(/try\s*\{/g) || []).length;
            functionsWithErrorHandling += tryCatchCount;

            if (functions.length > 5 && tryCatchCount === 0) {
                missing.push(file.path);
            }
        });

        const coverage = totalFunctions > 0 ? (functionsWithErrorHandling / totalFunctions) * 100 : 0;

        return {
            coverage: Math.round(coverage),
            missing: missing.slice(0, 10),
            recommendation: coverage < 50
                ? 'Add try-catch blocks and proper error responses'
                : 'Error handling coverage is good',
            score: Math.round(coverage)
        };
    }

    /**
     * Analyze naming conventions
     */
    private analyzeNamingConventions(files: CodeFile[]): NamingMetrics {
        const issues: string[] = [];
        let totalNames = 0;
        let goodNames = 0;

        files.forEach(file => {
            // Check for inconsistent naming
            const camelCaseVars = (file.content.match(/\w+[A-Z]\w+/g) || []).length;
            const snake_caseVars = (file.content.match(/\w+_\w+/g) || []).length;

            totalNames += camelCaseVars + snake_caseVars;

            if (camelCaseVars > 0 && snake_caseVars > 0) {
                issues.push(`Inconsistent naming in ${file.path} (camelCase + snake_case)`);
            } else {
                goodNames += camelCaseVars + snake_caseVars;
            }
        });

        const score = totalNames > 0 ? (goodNames / totalNames) * 100 : 100;

        return {
            score: Math.round(score),
            issues: issues.slice(0, 5),
            goodExamples: score > 80 ? ['Consistent naming style'] : []
        };
    }

    /**
     * Analyze documentation
     */
    private analyzeDocumentation(files: CodeFile[]): DocumentationMetrics {
        let totalFunctions = 0;
        let documentedFunctions = 0;
        const undocumented: string[] = [];

        files.forEach(file => {
            const functions = file.content.match(/function\s+\w+|class\s+\w+/g) || [];
            totalFunctions += functions.length;

            const docComments = (file.content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
            documentedFunctions += docComments;

            if (functions.length > 3 && docComments === 0) {
                undocumented.push(file.path);
            }
        });

        const score = totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 0;

        return {
            score: Math.round(score),
            undocumented: undocumented.slice(0, 10),
            recommendation: score < 60
                ? 'Add JSDoc comments for public APIs and complex functions'
                : 'Documentation coverage is acceptable'
        };
    }

    /**
     * Detect code smells
     */
    private detectCodeSmells(files: CodeFile[]): CodeSmell[] {
        const smells: CodeSmell[] = [];

        files.forEach(file => {
            const lines = file.content.split('\n');

            // Long function detection
            let currentFunction = '';
            let functionStartLine = 0;
            lines.forEach((line, index) => {
                if (/function\s+\w+|const\s+\w+\s*=\s*\(/.test(line)) {
                    currentFunction = line.trim();
                    functionStartLine = index + 1;
                }
                // If more than 50 lines between function declarations
                if (currentFunction && index - functionStartLine > 50) {
                    smells.push({
                        file: file.path,
                        line: functionStartLine,
                        smell: 'Long function (>50 lines)',
                        severity: 'medium',
                        suggestion: 'Extract into smaller functions'
                    });
                    currentFunction = '';
                }
            });

            // Duplicate code detection (simplified)
            const duplicatePatterns = file.content.match(/(.{20,})\1+/g);
            if (duplicatePatterns && duplicatePatterns.length > 3) {
                smells.push({
                    file: file.path,
                    line: 0,
                    smell: 'Duplicate code detected',
                    severity: 'medium',
                    suggestion: 'Extract duplicate logic into reusable functions'
                });
            }
        });

        return smells;
    }

    /**
     * Check best practices
     */
    private checkBestPractices(files: CodeFile[]): BestPracticesMetrics {
        const followed: string[] = [];
        const missing: string[] = [];

        const hasConstants = files.some(f => /const\s+[A-Z_]+\s*=/.test(f.content));
        if (hasConstants) {
            followed.push('Use of constants');
        } else {
            missing.push('Constants for magic numbers');
        }

        const hasErrorHandling = files.some(f => /try\s*\{/.test(f.content));
        if (hasErrorHandling) {
            followed.push('Error handling');
        } else {
            missing.push('Proper error handling');
        }

        const score = (followed.length / (followed.length + missing.length)) * 100;

        return {
            followed,
            missing,
            score: Math.round(score)
        };
    }

    /**
     * Generate refactoring suggestions
     */
    private generateRefactoringSuggestions(smells: CodeSmell[], complexity: ComplexityMetrics): string[] {
        const suggestions: string[] = [];

        if (smells.length > 5) {
            suggestions.push('Address code smells to improve maintainability');
        }

        if (complexity.high.length > 0) {
            suggestions.push('Simplify complex functions using Extract Method pattern');
        }

        if (suggestions.length === 0) {
            suggestions.push('Code quality is good - focus on consistent patterns');
        }

        return suggestions;
    }

    /**
     * Generate AI-powered refactoring suggestions
     */
    private async generateAIRefactoringSuggestions(files: CodeFile[], smells: CodeSmell[]): Promise<string[]> {
        // Select top 3 most complex or smelly files
        const problematicFiles = files
            .filter(f => smells.some(s => s.file === f.path) || f.content.length > 2000)
            .slice(0, 3);

        if (problematicFiles.length === 0) return [];

        const samples = problematicFiles.map(f => `File: ${f.path}\n${f.content.slice(0, 1000)}\n...`).join('\n\n');

        const prompt = `Suggest specific refactoring improvements for this code:
        
        ${samples}
        
        Focus on: Design patterns, readability, and performance.
        Provide JSON array of strings:
        ["suggestion 1", "suggestion 2", "suggestion 3"]`;

        try {
            const suggestions = await this.brain.generateInsights(prompt, 600, 0.2);
            return Array.isArray(suggestions) ? suggestions : [];
        } catch (error) {
            Logger.warn('[CodeQuality] AI recommendations failed, falling back to heuristics');
            return [];
        }
    }

    /**
     * Generate overall summary
     */
    private generateSummary(score: number, complexity: ComplexityMetrics, errorHandling: ErrorHandlingMetrics): string {
        if (score >= 80) {
            return 'Excellent code quality with strong fundamentals';
        } else if (score >= 60) {
            return 'Good foundation with room for improvement in error handling';
        } else {
            return 'Needs improvement in complexity and error handling';
        }
    }

    /**
     * Score to grade conversion
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
interface CodeFile {
    path: string;
    content: string;
}

interface CodeQualityReport {
    overallScore: number;
    grade: string;
    summary: string;
    metrics: {
        complexity: ComplexityMetrics;
        errorHandling: ErrorHandlingMetrics;
        naming: NamingMetrics;
        documentation: DocumentationMetrics;
    };
    codeSmells: CodeSmell[];
    bestPractices: BestPracticesMetrics;
    refactoringSuggestions: string[];
    timestamp: string;
}

interface ComplexityMetrics {
    average: number;
    high: string[];
    recommendations: string;
    score: number;
}

interface ErrorHandlingMetrics {
    coverage: number;
    missing: string[];
    recommendation: string;
    score: number;
}

interface NamingMetrics {
    score: number;
    issues: string[];
    goodExamples: string[];
}

interface DocumentationMetrics {
    score: number;
    undocumented: string[];
    recommendation: string;
}

interface CodeSmell {
    file: string;
    line: number;
    smell: string;
    severity: string;
    suggestion: string;
}

interface BestPracticesMetrics {
    followed: string[];
    missing: string[];
    score: number;
}
