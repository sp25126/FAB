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
            languages: [
                { pattern: /\bjavascript\b|\bjs\b/, name: 'javascript' },
                { pattern: /\bpython\b/, name: 'python' },
                { pattern: /\btypescript\b|\bts\b/, name: 'typescript' },
                { pattern: /\bjava\b(?!script)/, name: 'java' },
                { pattern: /\bc\+\+\b|\bcplusplus\b/, name: 'c++' },
                { pattern: /\bc\b(?!\+|#)/, name: 'c' },
                { pattern: /\bhtml5?\b/, name: 'html' },
                { pattern: /\bcss3?\b/, name: 'css' },
                { pattern: /\bc#\b|csharp/, name: 'c#' },
                { pattern: /\bgo\b|\bgolang\b/, name: 'go' },
                { pattern: /\brust\b/, name: 'rust' }
            ],
            frameworks: [
                { pattern: /\breact(\.js)?\b/, name: 'react' },
                { pattern: /\bnode(\.js)?\b/, name: 'node.js' },
                { pattern: /\bexpress(\.js)?\b/, name: 'express' },
                { pattern: /\bnestjs\b/, name: 'nestjs' },
                { pattern: /\bdjango\b/, name: 'django' },
                { pattern: /\bflask\b/, name: 'flask' },
                { pattern: /\bvue(\.js)?\b/, name: 'vue' },
                { pattern: /\bangular\b/, name: 'angular' },
                { pattern: /\btensorflow\b/, name: 'tensorflow' },
                { pattern: /\bpytorch\b/, name: 'pytorch' },
                { pattern: /\bhugging\s*face\b/, name: 'hugging face' },
                { pattern: /\bfastapi\b/, name: 'fastapi' }
            ],
            tools: [
                { pattern: /\bgit\b/, name: 'git' },
                { pattern: /\bgithub\b/, name: 'github' },
                { pattern: /\bdocker\b/, name: 'docker' },
                { pattern: /\bkubernetes\b|\bk8s\b/, name: 'kubernetes' },
                { pattern: /\baws\b/, name: 'aws' },
                { pattern: /\bmongodb\b|\bmongo\b/, name: 'mongodb' },
                { pattern: /\bpostgresql\b|\bpostgres\b/, name: 'postgresql' },
                { pattern: /\bredis\b/, name: 'redis' },
                { pattern: /\bn8n\b/, name: 'n8n' },
                { pattern: /\bmysql\b/, name: 'mysql' },
                { pattern: /\bvscode\b|visual\s*studio\s*code/, name: 'vscode' }
            ],
            concepts: [
                { pattern: /\brest\s*(api|ful)?\b/, name: 'rest api' },
                { pattern: /\bmicroservices?\b/, name: 'microservices' },
                { pattern: /\bmachine\s*learning\b|\b ml\b/, name: 'machine learning' },
                { pattern: /\bartificial\s*intelligence\b|\b ai\b/, name: 'ai' },
                { pattern: /\bdevops\b/, name: 'devops' },
                { pattern: /\bci\/cd\b/, name: 'ci/cd' },
                { pattern: /\bnlp\b|natural\s*language\s*processing/, name: 'nlp' },
                { pattern: /\bwhisper\s*ai\b/, name: 'whisper ai' },
                { pattern: /\bagile\b/, name: 'agile' }
            ]
        };

        Object.entries(techKeywords).forEach(([category, patterns]) => {
            patterns.forEach(({ pattern, name }) => {
                if (pattern.test(this.resumeText)) {
                    if (!this.claims.find(c => c.skill === name)) {
                        this.claims.push({
                            skill: name,
                            category: category.slice(0, -1) as any,
                            claimed: true,
                            evidenceStrength: 'NONE'
                        });
                    }
                }
            });
        });

        return this.claims;
    }

    getClaims(): ResumeClaim[] {
        return this.claims;
    }
}
