export interface RepoAnalysis {
    name: string;
    stars: number;
    forks: number;
    primaryLanguage: string;
    hasReadme: boolean;
    commitCount: number;
    lastUpdate: string;
}

export class GitHubAnalyzer {
    private username: string;
    private repos: any[];

    constructor(username: string) {
        this.username = username;
        this.repos = [];
    }

    async fetchRepos(): Promise<void> {
        const response = await fetch(`https://api.github.com/users/${this.username}/repos?per_page=100`);
        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.statusText}`);
        }
        this.repos = await response.json();
    }

    analyzeSignalQuality(): string {
        const totalRepos = this.repos.length;
        if (totalRepos === 0) return "WEAK: No repositories found";

        const forkedRepos = this.repos.filter(r => r.fork).length;
        const originalRepos = totalRepos - forkedRepos;

        const avgStars = this.repos.reduce((sum, r) => sum + r.stargazers_count, 0) / totalRepos;

        // Brutal truth logic
        if (originalRepos < 3) {
            return "WEAK: Mostly forks, no original work";
        }
        if (avgStars < 1 && originalRepos < 5) {
            return "WEAK: Low engagement, quantity over quality";
        }
        if (originalRepos >= 5 && avgStars > 2) {
            return "MODERATE: Some original work with engagement";
        }

        return "WEAK: Needs more substantial projects";
    }

    getTopRepos(count: number = 5): RepoAnalysis[] {
        return this.repos
            .filter(r => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, count)
            .map(r => ({
                name: r.name,
                stars: r.stargazers_count,
                forks: r.forks_count,
                primaryLanguage: r.language || 'Unknown',
                hasReadme: true, // We'll check this later
                commitCount: 0, // We'll fetch this later
                lastUpdate: r.updated_at
            }));
    }
}
