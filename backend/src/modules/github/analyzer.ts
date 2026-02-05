interface RepoAnalysis {
    name: string;
    stars: number;
    forks: number;
    language: string;
    isFork: boolean;
    lastUpdate: string;
}

export class GitHubAnalyzer {
    private username: string;
    private repos: any[] = [];

    constructor(username: string) {
        this.username = username;
    }

    async fetchRepos(): Promise<void> {
        const response = await fetch(
            `https://api.github.com/users/${this.username}/repos?per_page=100`
        );

        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.status}`);
        }

        this.repos = await response.json() as any[];
    }

    analyzeSignalQuality(): string {
        const totalRepos = this.repos.length;
        const originalRepos = this.repos.filter(r => !r.fork);
        const originalCount = originalRepos.length;

        const totalStars = originalRepos.reduce((sum, r) => sum + r.stargazers_count, 0);
        const avgStars = totalStars / (originalCount || 1);

        // BRUTAL HONESTY LOGIC
        if (totalRepos === 0) {
            return "CRITICAL: No repositories found. Create something.";
        }

        if (originalCount === 0) {
            return "CRITICAL: Only forked repos. No original work.";
        }

        if (originalCount < 3) {
            return "WEAK: Less than 3 original projects. Not enough depth.";
        }

        if (avgStars < 1 && originalCount < 5) {
            return "WEAK: Low engagement. Quantity without quality.";
        }

        if (originalCount >= 5 && avgStars >= 2) {
            return "MODERATE: Some solid work. Keep building depth.";
        }

        if (originalCount >= 8 && avgStars >= 5) {
            return "STRONG: Good portfolio with engagement.";
        }

        return "WEAK: Needs more substantial, well-documented projects.";
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
                language: r.language || 'Unknown',
                isFork: r.fork,
                lastUpdate: r.updated_at
            }));
    }

    getDetailedAnalysis() {
        const originalRepos = this.repos.filter(r => !r.fork);
        const languages = [...new Set(originalRepos.map(r => r.language).filter(Boolean))];

        return {
            totalRepos: this.repos.length,
            originalRepos: originalRepos.length,
            forkedRepos: this.repos.filter(r => r.fork).length,
            totalStars: originalRepos.reduce((sum, r) => sum + r.stargazers_count, 0),
            languages: languages,
            signalQuality: this.analyzeSignalQuality(),
            topProjects: this.getTopRepos(3)
        };
    }
}
