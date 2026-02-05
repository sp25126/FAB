import { GitHubAnalyzer } from '../github/analyzer';

interface VerificationResult {
    skill: string;
    claimed: boolean;
    githubEvidence: string;
    evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
    verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT';
    recommendation: string;
}

export class ClaimVerifier {
    private githubAnalyzer: GitHubAnalyzer;
    private githubLanguages: string[];
    private repoNames: string[];

    constructor(githubAnalyzer: GitHubAnalyzer) {
        this.githubAnalyzer = githubAnalyzer;
        const analysis = githubAnalyzer.getDetailedAnalysis();
        this.githubLanguages = analysis.languages.map(l => l.toLowerCase());
        this.repoNames = analysis.topProjects.map(p => p.name.toLowerCase());
    }

    verifyClaim(skill: string): VerificationResult {
        const lowerSkill = skill.toLowerCase();

        // Check if skill appears in languages
        const inLanguages = this.githubLanguages.includes(lowerSkill);

        // Check if skill appears in repo names
        const inRepoNames = this.repoNames.some(name => name.includes(lowerSkill));

        // Determine evidence strength
        let evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' = 'NONE';
        let githubEvidence = 'No evidence found in GitHub';
        let verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT' = 'FRAUDULENT';
        let recommendation = '';

        if (inLanguages && inRepoNames) {
            evidenceStrength = 'STRONG';
            githubEvidence = `Used in projects and listed as primary language`;
            verdict = 'VERIFIED';
            recommendation = 'Claim is well-supported. Can defend in interview.';
        } else if (inLanguages) {
            evidenceStrength = 'MODERATE';
            githubEvidence = `Found as primary language in repos`;
            verdict = 'VERIFIED';
            recommendation = 'Good evidence. Prepare specific examples.';
        } else if (inRepoNames) {
            evidenceStrength = 'WEAK';
            githubEvidence = `Mentioned in repo names only`;
            verdict = 'WEAK_SUPPORT';
            recommendation = 'Weak evidence. Build a substantial project or remove claim.';
        } else {
            evidenceStrength = 'NONE';
            githubEvidence = 'No evidence in GitHub';
            verdict = 'OVERCLAIMED';
            recommendation = 'REMOVE THIS IMMEDIATELY. Will be exposed in interview.';
        }

        return {
            skill,
            claimed: true,
            githubEvidence,
            evidenceStrength,
            verdict,
            recommendation
        };
    }

    verifyAllClaims(claims: string[]): VerificationResult[] {
        return claims.map(claim => this.verifyClaim(claim));
    }

    getSummary(results: VerificationResult[]) {
        const verified = results.filter(r => r.verdict === 'VERIFIED').length;
        const weakSupport = results.filter(r => r.verdict === 'WEAK_SUPPORT').length;
        const overclaimed = results.filter(r => r.verdict === 'OVERCLAIMED').length;

        return {
            totalClaims: results.length,
            verified,
            weakSupport,
            overclaimed,
            honestyScore: results.length > 0 ? Math.round((verified / results.length) * 100) : 0,
            risk: overclaimed > 0 ? 'HIGH' : (weakSupport > verified ? 'MODERATE' : 'LOW')
        };
    }
}
