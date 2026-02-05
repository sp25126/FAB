interface ResumeClaim {
    skill: string;
    category: 'language' | 'framework' | 'tool' | 'concept';
    claimed: boolean;
    evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
}

export class ResumeParser {
    private resumeText: string;
    private claims: ResumeClaim[] = [];

    constructor(resumeText: string) {
        this.resumeText = resumeText.toLowerCase();
    }

    extractClaims(): ResumeClaim[] {
        const techKeywords = {
            languages: ['javascript', 'python', 'typescript', 'java', 'c++', 'html', 'css'],
            frameworks: ['react', 'node.js', 'express', 'nestjs', 'django', 'flask', 'vue'],
            tools: ['git', 'docker', 'kubernetes', 'aws', 'mongodb', 'postgresql', 'redis'],
            concepts: ['rest api', 'microservices', 'machine learning', 'ai', 'devops', 'ci/cd']
        };

        // Extract all mentioned technologies
        Object.entries(techKeywords).forEach(([category, keywords]) => {
            keywords.forEach(keyword => {
                if (this.resumeText.includes(keyword)) {
                    this.claims.push({
                        skill: keyword,
                        category: category.slice(0, -1) as any, // Remove 's' from category name
                        claimed: true,
                        evidenceStrength: 'NONE' // Will be verified against GitHub
                    });
                }
            });
        });

        return this.claims;
    }

    getClaims(): ResumeClaim[] {
        return this.claims;
    }
}
