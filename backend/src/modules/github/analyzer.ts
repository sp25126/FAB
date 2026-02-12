
import fetch from 'node-fetch';
import axios from 'axios';
import { Logger } from '../logger';

interface RepoAnalysis {
    name: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    isFork: boolean;
    lastUpdate: string;
    topics: string[];
}

export interface DeepProjectAnalysis extends RepoAnalysis {
    techStack: string[];
    complexity: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
    architecture: string;
    readmeContent: string;
    coreFiles: { path: string; content: string; }[];
    commitCount: number;
    testCoverage: boolean;
    learnedSkills: string[]; // [NEW] Skills demonstrated in this project
    projectType: 'Web App' | 'CLI' | 'Library' | 'API' | 'Other'; // [NEW] Classification
    realWorldUtility: string; // [NEW] One sentence on why this matters
}

export class GitHubAnalyzer {
    private username: string;
    private token?: string;
    public repos: any[] = [];
    public lastError?: string;

    private static repoCache = new Map<string, { data: any[], timestamp: number }>();
    private static deepCache = new Map<string, { data: DeepProjectAnalysis[], timestamp: number }>();
    private static fileCache = new Map<string, { data: string, timestamp: number }>();
    private static CACHE_TTL = 60 * 60 * 1000; // 1 hour for production hardening

    constructor(username: string, token?: string) {
        this.username = username.trim();
        this.token = token?.trim();
    }

    private get headers(): { [key: string]: string } {
        const headers: { [key: string]: string } = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'FAB-Analyzer'
        };
        if (this.token) {
            headers['Authorization'] = this.token.startsWith('gh') ? `token ${this.token}` : `Bearer ${this.token}`;
        }
        return headers;
    }

    async fetchRepos(): Promise<void> {
        const cacheKey = `${this.username}:${!!this.token}`;
        const cached = GitHubAnalyzer.repoCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < GitHubAnalyzer.CACHE_TTL)) {
            Logger.info(`[GitHub] Using cached repos for ${this.username}`);
            this.repos = cached.data;
            return;
        }

        Logger.info(`[GitHub] Fetching repos for "${this.username}"...`);
        try {
            let apiUrl = `https://api.github.com/users/${this.username}/repos?per_page=100&sort=updated`;

            if (this.token) {
                try {
                    Logger.info(`[GitHub] Validating token...`);
                    const userRes = await fetch('https://api.github.com/user', { headers: this.headers });
                    if (userRes.ok) {
                        const user: any = await userRes.json();
                        Logger.info(`[GitHub] Token login: ${user.login}`);
                        if (user.login.toLowerCase() === this.username.toLowerCase()) {
                            apiUrl = `https://api.github.com/user/repos?per_page=100&sort=updated&type=all`;
                            Logger.info(`[GitHub] Matches! Using authenticated 'user/repos' endpoint.`);
                        } else {
                            Logger.info(`[GitHub] Token belongs to ${user.login}, but searching for ${this.username}. Using public endpoint.`);
                        }
                    } else {
                        Logger.warn(`[GitHub] Token validation result: ${userRes.status}. Falling back to public.`);
                    }
                } catch (e) {
                    Logger.warn("[GitHub] Token check exception, falling back to public.");
                }
            }

            Logger.info(`[GitHub] API Request: ${apiUrl}`);
            const response = await fetch(apiUrl, { headers: this.headers });

            if (!response.ok) {
                const errorBody = await response.text();
                Logger.error(`[GitHub] API Error: ${response.status} - ${errorBody}`);

                // Rate limit fallback using Client ID/Secret if unauthenticated
                if (response.status === 403 && !this.token && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
                    Logger.info("[GitHub] Rate limited as anonymous, retrying with Client ID/Secret...");
                    const authUrl = `https://api.github.com/users/${this.username}/repos?per_page=100&sort=updated&client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}`;
                    const res2 = await fetch(authUrl, { headers: { 'User-Agent': 'FAB-Analyzer' } }); // No auth header
                    if (res2.ok) {
                        this.repos = await res2.json() as any[];
                        Logger.info(`[GitHub] Success with Client ID! Found ${this.repos.length} repos.`);
                        return;
                    } else {
                        Logger.error(`[GitHub] Client ID fallback also failed: ${res2.status}`);
                    }
                }

                if (this.token && (response.status === 401 || response.status === 403)) {
                    Logger.warn("[GitHub] Token rejected/expired, retrying as anonymous...");
                    this.token = undefined;
                    return this.fetchRepos();
                }

                if (response.status === 404) throw new Error(`GitHub User "${this.username}" not found.`);
                throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
            }

            this.repos = await response.json() as any[];

            if (this.repos.length > 0) {
                GitHubAnalyzer.repoCache.set(cacheKey, { data: this.repos, timestamp: Date.now() });
                Logger.info(`[GitHub] Successfully found ${this.repos.length} repositories for ${this.username}`);
            } else {
                Logger.warn(`[GitHub] API returned 0 repositories for ${this.username} at ${apiUrl}.`);
            }
        } catch (error: any) {
            this.lastError = error.message;
            Logger.error(`[GitHub] Fetch process failed: ${error.message}`);
            this.repos = [];
        }
    }

    private async fetchWithTimeout(url: string, options: any = {}, timeout: number = 15000): Promise<any> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error: any) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error(`Fetch timeout for ${url}`);
            }
            throw error;
        }
    }

    async analyzeProjectsDeep(count: number = 5): Promise<DeepProjectAnalysis[]> {
        const cacheKey = `${this.username}:${count}:${!!this.token}`;
        const cached = GitHubAnalyzer.deepCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < GitHubAnalyzer.CACHE_TTL)) {
            Logger.info(`[GitHub] Using cached deep analysis for ${this.username}`);
            return cached.data;
        }

        let targetRepos = this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, count);

        if (targetRepos.length === 0 && this.repos.length > 0) {
            targetRepos = this.repos
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, count);
        }

        console.log(`[GitHub] Deep analyzing ${targetRepos.length} projects...`);

        // Define concurrency limit for deep project analysis
        const CONCURRENCY_LIMIT = 3;
        const results: DeepProjectAnalysis[] = [];

        for (let i = 0; i < targetRepos.length; i += CONCURRENCY_LIMIT) {
            const batch = targetRepos.slice(i, i + CONCURRENCY_LIMIT);
            const batchResults = await Promise.all(batch.map(async (repo) => {
                try {
                    Logger.info(`[GitHub] Starting deep analysis for ${repo.name}`);
                    const start = Date.now();

                    const [readme, languages, fileStructure, commits] = await Promise.all([
                        this.fetchReadme(repo.name),
                        this.fetchLanguages(repo.name),
                        this.fetchFileStructure(repo.name),
                        this.fetchCommitCount(repo.name)
                    ]);

                    let coreFiles: { path: string, content: string }[] = [];
                    let techStack: string[] = Object.keys(languages).slice(0, 5);
                    let testCoverage = false;
                    let learnedSkills: string[] = [];
                    let projectType: any = 'Other';
                    let realWorldUtility = 'Personal Project';

                    if (this.token) {
                        coreFiles = await this.fetchCoreFiles(repo.name, fileStructure);
                        const packageJson = await this.fetchFileContent(repo.name, 'package.json');
                        if (packageJson) {
                            techStack = [...techStack, ...this.extractDependencies(packageJson)];
                        }
                        testCoverage = fileStructure.some(f => f.path.includes('test') || f.path.includes('spec'));
                    }

                    let complexity = 'INTERMEDIATE';
                    let architecture = 'Unknown';
                    const brainType = process.env.BRAIN_TYPE || 'local';
                    const remoteUrl = process.env.REMOTE_BRAIN_URL;

                    if (brainType === 'remote' && remoteUrl && repo.description) {
                        try {
                            const prompt = `Project: ${repo.name}\nDescription: ${repo.description}\nLanguages: ${Object.keys(languages).join(', ')}\nFiles: ${coreFiles.map(f => f.path).join(', ')}`;
                            const cloudRes = await axios.post(`${remoteUrl}/analyze-project`, {
                                prompt: prompt,
                                system_prompt: "Analyze complexity, architecture, and SKILLS. Return JSON: { complexity, architecture, learnedSkills: [], projectType, realWorldUtility }",
                                max_tokens: 1024
                            }, { timeout: 60000 });

                            const cloudAnalysis = (cloudRes.data as any).analysis;
                            if (cloudAnalysis) {
                                if (['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(cloudAnalysis.complexity)) complexity = cloudAnalysis.complexity;
                                architecture = cloudAnalysis.architecture || architecture;
                                if (Array.isArray(cloudAnalysis.learnedSkills)) learnedSkills = cloudAnalysis.learnedSkills;
                                if (cloudAnalysis.projectType) projectType = cloudAnalysis.projectType;
                                if (cloudAnalysis.realWorldUtility) realWorldUtility = cloudAnalysis.realWorldUtility;
                            }
                        } catch (e) {
                            complexity = this.assessComplexity(repo, languages, commits, coreFiles.length);
                            architecture = this.detectArchitecture(coreFiles, techStack);
                        }
                    } else {
                        complexity = this.assessComplexity(repo, languages, commits, coreFiles.length);
                        architecture = this.detectArchitecture(coreFiles, techStack);
                        learnedSkills = this.inferSkillsFromTech(techStack);
                    }

                    Logger.info(`[GitHub] Finished deep analysis for ${repo.name} in ${Date.now() - start}ms`);

                    return {
                        name: repo.name,
                        description: repo.description || '',
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        language: repo.language || 'Unknown',
                        isFork: repo.fork,
                        lastUpdate: repo.updated_at,
                        topics: repo.topics || [],
                        readmeContent: readme.substring(0, 1500),
                        techStack: Array.from(new Set(techStack)),
                        complexity: complexity as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED',
                        architecture,
                        coreFiles,
                        commitCount: commits,
                        testCoverage,
                        learnedSkills,
                        projectType,
                        realWorldUtility
                    };
                } catch (e: any) {
                    console.warn(`[GitHub] Failed to analyze ${repo.name}: ${e.message}`);
                    return null;
                }
            }));

            results.push(...batchResults.filter((r): r is DeepProjectAnalysis => r !== null));
        }

        GitHubAnalyzer.deepCache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    }

    async analyzeProjectsLight(count: number = 10): Promise<DeepProjectAnalysis[]> {
        const targetRepos = this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, count);

        const results: DeepProjectAnalysis[] = [];
        for (const repo of targetRepos) {
            try {
                const [readme, languages] = await Promise.all([
                    this.fetchReadme(repo.name),
                    this.fetchLanguages(repo.name)
                ]);
                const techStack: string[] = Object.keys(languages).slice(0, 5);
                const complexity = repo.stargazers_count > 10 ? 'INTERMEDIATE' : 'BASIC';

                results.push({
                    name: repo.name,
                    description: repo.description || '',
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language || 'Unknown',
                    isFork: repo.fork,
                    lastUpdate: repo.updated_at,
                    topics: repo.topics || [],
                    readmeContent: readme.substring(0, 2000),
                    techStack,
                    complexity: complexity as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED',
                    architecture: 'Unknown (Light Mode)',
                    coreFiles: [],
                    commitCount: 0,
                    testCoverage: false,
                    learnedSkills: [],
                    projectType: 'Other',
                    realWorldUtility: 'Unknown (Light Mode)'
                });
            } catch (e: any) { }
        }
        return results;
    }

    public async fetchReadme(repoName: string): Promise<string> {
        const url = `https://api.github.com/repos/${this.username}/${repoName}/readme`;
        Logger.info(`[GitHub] Fetching README: ${repoName}`);
        try {
            const res = await this.fetchWithTimeout(url, { headers: this.headers });
            if (!res.ok) return "";
            const data: any = await res.json();
            return Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (e: any) {
            Logger.warn(`[GitHub] README fetch failed: ${repoName} - ${e.message}`);
            return "";
        }
    }

    public async fetchLanguages(repoName: string): Promise<Record<string, number>> {
        const url = `https://api.github.com/repos/${this.username}/${repoName}/languages`;
        Logger.info(`[GitHub] Fetching languages: ${repoName}`);
        try {
            const res = await this.fetchWithTimeout(url, { headers: this.headers });
            return res.ok ? await res.json() as any : {};
        } catch (e: any) {
            Logger.warn(`[GitHub] Languages fetch failed: ${repoName} - ${e.message}`);
            return {};
        }
    }

    public async fetchFileStructure(repoName: string): Promise<any[]> {
        const url = `https://api.github.com/repos/${this.username}/${repoName}/git/trees/main?recursive=1`;
        Logger.info(`[GitHub] Fetching file structure: ${repoName}`);
        try {
            let res = await this.fetchWithTimeout(url, { headers: this.headers });
            if (!res.ok) {
                const url2 = `https://api.github.com/repos/${this.username}/${repoName}/git/trees/master?recursive=1`;
                res = await this.fetchWithTimeout(url2, { headers: this.headers });
                if (!res.ok) return [];
            }
            const data: any = await res.json();
            return data.tree || [];
        } catch (e: any) {
            Logger.warn(`[GitHub] File structure fetch failed: ${repoName} - ${e.message}`);
            return [];
        }
    }

    public async fetchCommitCount(repoName: string): Promise<number> {
        const url = `https://api.github.com/repos/${this.username}/${repoName}/commits?per_page=1`;
        Logger.info(`[GitHub] Fetching commit count: ${repoName}`);
        try {
            const res = await this.fetchWithTimeout(url, { headers: this.headers });
            if (!res.ok) return 0;
            const link = res.headers.get('link');
            if (link) {
                const match = link.match(/&page=(\d+)>; rel="last"/);
                if (match) return parseInt(match[1]);
            }
            // If no link header, there might be 1 page (if we got a response)
            return 1;
        } catch (e: any) {
            Logger.warn(`[GitHub] Commit count fetch failed: ${repoName} - ${e.message}`);
            return 0;
        }
    }

    public async fetchCoreFiles(repoName: string, tree: any[]): Promise<{ path: string, content: string }[]> {
        const interesting = tree.filter((f: any) =>
            f.type === 'blob' &&
            (
                f.path.match(/^(src|app|lib|backend|frontend|api)\/.*\.(ts|js|py|go|rs|java|css|html)$/) ||
                f.path.match(/^.*\.(ts|js|py|go|rs|java|css|html)$/) ||
                f.path.match(/^(Dockerfile|docker-compose\.yml|requirements\.txt|package\.json|setup\.py|go\.mod|Cargo\.toml|README\.md)$/i)
            ) &&
            !f.path.includes('test') &&
            !f.path.includes('node_modules')
        ).slice(0, 8); // Reduced to 8 for token efficiency

        const results = await Promise.all(interesting.map(async (file) => {
            const content = await this.fetchFileContent(repoName, file.path);
            if (content) return { path: file.path, content: content.substring(0, 3000) };
            return null;
        }));

        return results.filter((f): f is { path: string, content: string } => f !== null);
    }

    public async fetchFileContent(repoName: string, path: string): Promise<string | null> {
        const cacheKey = `${this.username}/${repoName}/${path}`;
        const cached = GitHubAnalyzer.fileCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < GitHubAnalyzer.CACHE_TTL)) {
            return cached.data;
        }

        const url = `https://api.github.com/repos/${this.username}/${repoName}/contents/${path}`;
        Logger.info(`[GitHub] Fetching file content: ${repoName}/${path}`);
        try {
            const res = await this.fetchWithTimeout(url, { headers: this.headers });
            if (!res.ok) return null;
            const data: any = await res.json();
            if (data.content) {
                const content = Buffer.from(data.content, 'base64').toString('utf-8');
                GitHubAnalyzer.fileCache.set(cacheKey, { data: content, timestamp: Date.now() });
                return content;
            }
            return null;
        } catch (e: any) {
            Logger.warn(`[GitHub] File content fetch failed: ${repoName}/${path} - ${e.message}`);
            return null;
        }
    }

    private extractDependencies(packageJsonStr: string): string[] {
        try {
            const pkg = JSON.parse(packageJsonStr);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            return Object.keys(deps);
        } catch { return []; }
    }

    private assessComplexity(repo: any, langs: any, commits: number, coreFilesCount: number): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' {
        if (commits > 100 && coreFilesCount > 0) return 'ADVANCED';
        if (repo.stargazers_count > 10 || commits > 30) return 'INTERMEDIATE';
        return 'BASIC';
    }

    private detectArchitecture(files: { path: string, content: string }[], tech: string[]): string {
        const paths = files.map(f => f.path).join(' ');
        if (paths.includes('controller') && paths.includes('model')) return 'MVC';
        if (tech.includes('react') && tech.includes('express')) return 'MERN Stack';
        if (paths.includes('microservice') || paths.includes('docker-compose')) return 'Microservices';
        return 'Monolith/Script';
    }

    private inferSkillsFromTech(techStack: string[]): string[] {
        const skills = new Set<string>();
        const t = techStack.map(t => t.toLowerCase());
        if (t.includes('react') || t.includes('vue')) skills.add('Frontend Development');
        if (t.includes('express') || t.includes('nest')) skills.add('API Development');
        if (t.includes('mongoose') || t.includes('prisma')) skills.add('Database Management');
        if (t.includes('docker')) skills.add('Containerization');
        if (t.includes('typescript')) skills.add('TypeScript');
        return Array.from(skills);
    }

    getDetailedAnalysis(): any {
        const languages = new Set<string>();
        const topProjects = this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 10);

        this.repos.forEach(r => {
            if (r.language) languages.add(r.language);
        });

        return {
            languages: Array.from(languages),
            topProjects: topProjects.map(p => ({
                name: p.name,
                stars: p.stargazers_count,
                description: p.description,
                language: p.language
            }))
        };
    }

    getRecentActivityDays(): number {
        if (!this.repos || this.repos.length === 0) return 0;
        const now = Date.now();
        const mostRecent = Math.max(...this.repos.map(r => new Date(r.updated_at).getTime()));
        const diff = now - mostRecent;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
}
