
export class GitHubUtils {
    /**
     * Resolve owner/repo from various input formats
     */
    static resolveProjectCoordinates(input: string, defaultOwner: string): { owner: string; repo: string } {
        // Handle URL inputs: https://github.com/owner/repo
        if (input.includes('github.com')) {
            try {
                // Remove query params and hash
                const cleanInput = input.split('?')[0].split('#')[0];
                const parts = cleanInput.split('github.com/')[1].split('/');
                return {
                    owner: parts[0],
                    repo: parts[1]?.replace('.git', '') || parts[1]
                };
            } catch (e) {
                // Fallback
            }
        }
        // Handle owner/repo format
        else if (input.includes('/')) {
            const parts = input.split('/');
            return {
                owner: parts[0],
                repo: parts[1]
            };
        }
        // Default to simple name
        return {
            owner: defaultOwner,
            repo: input
        };
    }

    /**
     * Parse strict GitHub URL
     */
    static parseGitHubUrl(url: string): { owner: string; repo: string } {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            throw { status: 400, message: 'Invalid GitHub URL format' };
        }
        return { owner: match[1], repo: match[2].replace('.git', '') };
    }
}
