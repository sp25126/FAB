
import fetch from 'node-fetch';
import axios from 'axios';


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
}

export class GitHubAnalyzer {
    private username: string;
    private token?: string;
    private repos: any[] = [];
    public lastError?: string;

    constructor(username: string, token?: string) {
        this.username = username;
        this.token = token;
    }

    private get headers(): { [key: string]: string } {
        const headers: { [key: string]: string } = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        return headers;
    }

    async fetchRepos(): Promise<void> {
        console.log(`[GitHub] Fetching repos for ${this.username}...`);
        try {
            const response = await fetch(
                `https://api.github.com/users/${this.username}/repos?per_page=100&sort=updated`,
                { headers: this.headers }
            );

            if (!response.ok) {
                if (response.status === 403) throw new Error("GitHub API rate limit exceeded");
                if (response.status === 404) throw new Error("User not found");
                throw new Error(`GitHub API error: ${response.status}`);
            }

            this.repos = await response.json() as any[];
            console.log(`[GitHub] Found ${this.repos.length} repositories`);
        } catch (error: any) {
            console.error(`[GitHub] Error: ${error.message}`);
            this.lastError = error.message;
            this.repos = [];
        }
    }

    async analyzeProjectsDeep(count: number = 5): Promise<DeepProjectAnalysis[]> {
        // First try non-fork repos, then include forks if needed
        let targetRepos = this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, count);

        // Fallback: if no original repos, include forks
        if (targetRepos.length === 0 && this.repos.length > 0) {
            console.log('[GitHub] No original repos found, including forks...');
            targetRepos = this.repos
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, count);
        }

        console.log(`[GitHub] Deep analyzing ${targetRepos.length} projects...`);

        const results: DeepProjectAnalysis[] = [];

        for (const repo of targetRepos) {
            try {
                // Parallel fetching of project details
                const [readme, languages, fileStructure, commits] = await Promise.all([
                    this.fetchReadme(repo.name),
                    this.fetchLanguages(repo.name),
                    this.fetchFileStructure(repo.name),
                    this.fetchCommitCount(repo.name)
                ]);

                // Deep code analysis if token (and access) is available
                let coreFiles: { path: string, content: string }[] = [];
                let techStack: string[] = Object.keys(languages).slice(0, 5);
                let testCoverage = false;

                if (this.token) {
                    // Start AUTHENTICATED Deep Scan (Full Content)
                    coreFiles = await this.fetchCoreFiles(repo.name, fileStructure);
                    const packageJson = await this.fetchFileContent(repo.name, 'package.json');
                    if (packageJson) {
                        techStack = [...techStack, ...this.extractDependencies(packageJson)];
                    }
                    testCoverage = fileStructure.some(f => f.path.includes('test') || f.path.includes('spec'));
                } else {
                    // Start SMART FALLBACK (No Token, but try to be deep)
                    // limit to top 3 to be safe with rate limits
                    if (results.length < 3) {
                        console.log(`[GitHub] Smart Fallback processing for ${repo.name}...`);
                        // We can still try to get package.json publically if rate limit allows
                        const packageJson = await this.fetchFileContent(repo.name, 'package.json');
                        if (packageJson) {
                            techStack = [...techStack, ...this.extractDependencies(packageJson)];
                        }

                        // We can infer architecture from file structure names alone (no content needed)
                        // logic is handled in detectArchitecture using 'coreFiles' (which are empty here) or we need a new method.
                        // Let's populate 'coreFiles' with just paths (no content) so detectArchitecture works!
                        const interestingPaths = fileStructure.filter((f: any) =>
                            f.path.match(/^(src|app|lib|backend|frontend|api)\/.*\.(ts|js|py|go|rs|java)$/) ||
                            f.path.includes('docker') ||
                            f.path.includes('controller')
                        ).slice(0, 15);

                        coreFiles = interestingPaths.map((f: any) => ({ path: f.path, content: "" })); // Content empty
                        testCoverage = fileStructure.some(f => f.path.includes('test') || f.path.includes('spec'));
                    }
                }

                let complexity = 'INTERMEDIATE'; // Default
                let architecture = 'Unknown';

                // Cloud Offloading (Smart Logic)
                const brainType = process.env.BRAIN_TYPE || 'local';
                const remoteUrl = process.env.REMOTE_BRAIN_URL;

                if (brainType === 'remote' && remoteUrl && repo.description) { // Only offload if description exists
                    try {
                        const prompt = `Project: ${repo.name}\nDescription: ${repo.description}\nLanguages: ${Object.keys(languages).join(', ')}\nFiles: ${coreFiles.map(f => f.path).join(', ')}`;
                        console.log(`☁️ Offloading analysis for ${repo.name} to Cloud Brain...`);

                        const cloudRes = await axios.post(`${remoteUrl}/analyze-project`, {
                            prompt: prompt,
                            system_prompt: "Analyze complexity and architecture.",
                            max_tokens: 512
                        }, { timeout: 10000 });

                        const cloudAnalysis = (cloudRes.data as any).analysis;
                        if (cloudAnalysis) {
                            if (['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(cloudAnalysis.complexity)) {
                                complexity = cloudAnalysis.complexity;
                            }
                            architecture = cloudAnalysis.architecture || architecture;
                        }
                    } catch (e) {
                        console.warn(`⚠️ Cloud analysis failed, falling back to local: ${(e as Error).message}`);
                        // Fallback to local logic
                        complexity = this.assessComplexity(repo, languages, commits, coreFiles.length);
                        architecture = this.detectArchitecture(coreFiles, techStack);
                    }
                } else {
                    // Local Logic
                    complexity = this.assessComplexity(repo, languages, commits, coreFiles.length);
                    architecture = this.detectArchitecture(coreFiles, techStack);
                }

                results.push({
                    name: repo.name,
                    description: repo.description || '',
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language || 'Unknown',
                    isFork: repo.fork,
                    lastUpdate: repo.updated_at,
                    topics: repo.topics || [],
                    readmeContent: readme.substring(0, 1500), // First 1500 chars for context
                    techStack: Array.from(new Set(techStack)), // Unique
                    complexity: complexity as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED',
                    architecture,
                    coreFiles,
                    commitCount: commits,
                    testCoverage
                });

                console.log(`   - Analyzed ${repo.name} (${complexity})`);

            } catch (e: any) {
                console.warn(`[GitHub] Failed to analyze ${repo.name}: ${e.message}`);
            }
        }

        return results;
    }

    /**
     * Light analysis for when no GitHub token is provided.
     * Fetches only public metadata: README, languages, and file structure (no file contents).
     * Respects API rate limits by avoiding content fetches.
     */
    async analyzeProjectsLight(count: number = 10): Promise<DeepProjectAnalysis[]> {
        const targetRepos = this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, count);

        console.log(`[GitHub] Light analyzing ${targetRepos.length} projects (No Token)...`);

        const results: DeepProjectAnalysis[] = [];

        for (const repo of targetRepos) {
            try {
                // Parallel fetching of basic metadata only
                const [readme, languages] = await Promise.all([
                    this.fetchReadme(repo.name),
                    this.fetchLanguages(repo.name)
                ]);

                const techStack: string[] = Object.keys(languages).slice(0, 5);

                // Infer complexity from repo stats (no deep analysis)
                const complexity = repo.stargazers_count > 10 ? 'INTERMEDIATE' :
                    repo.forks_count > 5 ? 'INTERMEDIATE' : 'BASIC';

                results.push({
                    name: repo.name,
                    description: repo.description || '',
                    stars: repo.stargazers_count,
                    forks: repo.forks_count,
                    language: repo.language || 'Unknown',
                    isFork: repo.fork,
                    lastUpdate: repo.updated_at,
                    topics: repo.topics || [],
                    readmeContent: readme.substring(0, 2000), // More README context for light mode
                    techStack,
                    complexity: complexity as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED',
                    architecture: 'Unknown (Light Mode)',
                    coreFiles: [], // No file contents in light mode
                    commitCount: 0, // Skip commit counting to save API calls
                    testCoverage: false
                });

                console.log(`   - Light analyzed ${repo.name}`);

            } catch (e: any) {
                console.warn(`[GitHub] Failed to light-analyze ${repo.name}: ${e.message}`);
            }
        }

        return results;
    }

    private async fetchReadme(repoName: string): Promise<string> {
        try {
            const res = await fetch(`https://api.github.com/repos/${this.username}/${repoName}/readme`, { headers: this.headers });
            if (!res.ok) return "";
            const data: any = await res.json();
            return Buffer.from(data.content, 'base64').toString('utf-8');
        } catch { return ""; }
    }

    private async fetchLanguages(repoName: string): Promise<Record<string, number>> {
        try {
            const res = await fetch(`https://api.github.com/repos/${this.username}/${repoName}/languages`, { headers: this.headers });
            return res.ok ? await res.json() as any : {};
        } catch { return {}; }
    }

    private async fetchFileStructure(repoName: string): Promise<any[]> {
        // Get the tree recursively (limit to depth 2 to save time/tokens)
        try {
            const branch = 'main'; // Assume main (or master, ideally check default_branch)
            const res = await fetch(`https://api.github.com/repos/${this.username}/${repoName}/git/trees/${branch}?recursive=1`, { headers: this.headers });
            if (!res.ok) return [];
            const data: any = await res.json();
            return data.tree || [];
        } catch { return []; }
    }

    private async fetchCommitCount(repoName: string): Promise<number> {
        try {
            // Link header method is robust but requires parsing. Simple method: per_page=1 & page=1 gives most recent. 
            // Getting total count is hard without traversing. 
            // Approximation:
            const res = await fetch(`https://api.github.com/repos/${this.username}/${repoName}/commits?per_page=1`, { headers: this.headers });
            if (!res.ok) return 0;
            // Parse 'Link' header for last page
            const link = res.headers.get('link');
            if (link) {
                const match = link.match(/&page=(\d+)>; rel="last"/);
                if (match) return parseInt(match[1]);
            }
            return 10; // Fallback
        } catch { return 0; }
    }

    private async fetchCoreFiles(repoName: string, tree: any[]): Promise<{ path: string, content: string }[]> {
        // Find interesting files: src/main, app.ts, server.js, models/, controllers/
        // Also look for core setup/config files
        const interesting = tree.filter((f: any) =>
            f.type === 'blob' &&
            (
                f.path.match(/^(src|app|lib|backend|frontend|api)\/.*\.(ts|js|py|go|rs|java|css|html)$/) ||
                f.path.match(/^.*\.(ts|js|py|go|rs|java|css|html)$/) ||
                f.path.match(/^(Dockerfile|docker-compose\.yml|requirements\.txt|package\.json|setup\.py|go\.mod|Cargo\.toml|README\.md)$/i)
            ) &&
            !f.path.includes('test') &&
            !f.path.includes('node_modules') &&
            !f.path.includes('.git/')
        ).slice(0, 10); // Analyze up to 10 core files

        const files = [];
        for (const file of interesting) {
            const content = await this.fetchFileContent(repoName, file.path);
            if (content) files.push({ path: file.path, content: content.substring(0, 3000) }); // Limit content size per file
        }
        return files;
    }

    private async fetchFileContent(repoName: string, path: string): Promise<string | null> {
        try {
            const res = await fetch(`https://api.github.com/repos/${this.username}/${repoName}/contents/${path}`, { headers: this.headers });
            if (!res.ok) return null;
            const data: any = await res.json();
            return Buffer.from(data.content || '', 'base64').toString('utf-8');
        } catch { return null; }
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
        // Very basic heuristic
        const paths = files.map(f => f.path).join(' ');
        if (paths.includes('controller') && paths.includes('model')) return 'MVC';
        if (tech.includes('react') && tech.includes('express')) return 'MERN Stack';
        if (paths.includes('microservice') || paths.includes('docker-compose')) return 'Microservices';
        if (paths.includes('lambda') || paths.includes('serverless')) return 'Serverless';
        return 'Monolith/Script';
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
}
