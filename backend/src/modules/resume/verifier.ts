import { GitHubAnalyzer } from '../github/analyzer';

interface VerificationResult {
    skill: string;
    claimed: boolean;
    githubEvidence: string;
    evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
    verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT';
    recommendation: string;
    projectIdea?: string;
    learningPath?: string;
    howToFix?: string;
}

// Skill-specific recommendations database
const SKILL_RECOMMENDATIONS: { [key: string]: { project: string; learning: string; howToFix: string } } = {
    'react': {
        project: 'Build a Task Manager with React + Redux: CRUD operations, local storage, drag-and-drop sorting.',
        learning: 'Complete React docs tutorial → Build 3 mini-projects → Learn Redux → Deploy on Vercel',
        howToFix: 'Create 2-3 public React repos with proper README. Use Create React App or Vite.'
    },
    'react.js': {
        project: 'Build a Task Manager with React + Redux: CRUD operations, local storage, drag-and-drop sorting.',
        learning: 'Complete React docs tutorial → Build 3 mini-projects → Learn Redux → Deploy on Vercel',
        howToFix: 'Create 2-3 public React repos with proper README. Use Create React App or Vite.'
    },
    'node.js': {
        project: 'Build a REST API with Node.js + Express: Authentication, CRUD, PostgreSQL, rate limiting.',
        learning: 'Node.js crash course → Express.js → Build 2 APIs → Add authentication → Deploy on Railway',
        howToFix: 'Create backend repos with package.json showing node/express. Include API documentation.'
    },
    'express.js': {
        project: 'Build a Blog API with Express: JWT auth, role-based access, MongoDB, file uploads.',
        learning: 'Express fundamentals → Middleware → Error handling → Build a full REST API',
        howToFix: 'Create Express server repos. Show middleware usage and proper project structure.'
    },
    'python': {
        project: 'Build a Web Scraper + Data Analysis tool: Scrape data, analyze with pandas, visualize with matplotlib.',
        learning: 'Python basics → Libraries (requests, beautifulsoup, pandas) → Automation scripts',
        howToFix: 'Push Python scripts to GitHub. Include requirements.txt and proper documentation.'
    },
    'django': {
        project: 'Build a Social Media Clone: User auth, posts, comments, likes, follow system, REST API.',
        learning: 'Django Girls tutorial → Django REST Framework → Deploy on PythonAnywhere',
        howToFix: 'Create Django project with models, views, templates. Add Django to repo languages.'
    },
    'docker': {
        project: 'Dockerize any of your existing projects: Dockerfile, docker-compose, multi-stage builds.',
        learning: 'Docker basics → Write Dockerfiles → docker-compose → Push to Docker Hub',
        howToFix: 'Add Dockerfile to existing repos. Create docker-compose.yml for multi-container apps.'
    },
    'kubernetes': {
        project: 'Deploy a microservices app on Kubernetes: Pods, Services, Deployments, ConfigMaps.',
        learning: 'Kubernetes basics → Minikube → Deploy sample app → Learn Helm',
        howToFix: 'Create a repo with k8s manifests. Deploy on free tier of GKE or use Minikube.'
    },
    'aws': {
        project: 'Build a Serverless API: Lambda + API Gateway + DynamoDB, deploy with SAM/CDK.',
        learning: 'AWS Free Tier → Lambda basics → API Gateway → S3 → Get AWS Cloud Practitioner cert',
        howToFix: 'Create a repo using AWS SDK. Deploy something on AWS and document it in README.'
    },
    'mongodb': {
        project: 'Build a Notes App with MongoDB: CRUD operations, indexing, text search, aggregation.',
        learning: 'MongoDB University free courses → Practice with Compass → Build MERN app',
        howToFix: 'Create projects using mongoose/mongodb driver. Show schema design in code.'
    },
    'git': {
        project: 'Contribute to any open source project: Fork, branch, PR, code review cycle.',
        learning: 'Git basics → Branching strategies → GitHub flow → Contribute to OSS',
        howToFix: 'Make regular commits, use branches, write good commit messages. Activity shows on profile.'
    },
    'github': {
        project: 'Build a GitHub profile README with your projects, stats, and contributions.',
        learning: 'Create repos → Write READMEs → Contribute to others → Build portfolio',
        howToFix: 'Increase GitHub activity. Green squares = proof. Quality commits matter.'
    },
    'rest api': {
        project: 'Build a RESTful API for any domain: Proper status codes, pagination, filtering, documentation.',
        learning: 'REST principles → Build API with Express/FastAPI → Document with Swagger/OpenAPI',
        howToFix: 'Create API repos with proper endpoints. Include Postman collection or OpenAPI spec.'
    },
    'rest apis': {
        project: 'Build a RESTful API for any domain: Proper status codes, pagination, filtering, documentation.',
        learning: 'REST principles → Build API with Express/FastAPI → Document with Swagger/OpenAPI',
        howToFix: 'Create API repos with proper endpoints. Include Postman collection or OpenAPI spec.'
    },
    'ci/cd': {
        project: 'Set up GitHub Actions pipeline: Lint, test, build, deploy on every push.',
        learning: 'GitHub Actions basics → Write workflows → Add to existing projects',
        howToFix: 'Add .github/workflows/ to your repos. Show automated testing and deployment.'
    },
    'typescript': {
        project: 'Rewrite a JS project in TypeScript: Add types, interfaces, strict mode.',
        learning: 'TypeScript handbook → Convert existing projects → Use with React/Node',
        howToFix: 'Use .ts files in repos. Add tsconfig.json and proper type definitions.'
    },
    'javascript': {
        project: 'Build an Interactive Web App: DOM manipulation, async/await, local storage, vanilla JS.',
        learning: 'JS fundamentals → ES6+ features → Async programming → Build projects',
        howToFix: 'Create repos with .js files. Show modern JavaScript usage (ES6+).'
    },
    'html': {
        project: 'Build a complete landing page: Semantic HTML5, accessibility, meta tags, structured data.',
        learning: 'HTML5 semantics → Accessibility (a11y) → SEO basics → Build portfolio site',
        howToFix: 'Create repos with .html files. Use semantic elements and proper structure.'
    },
    'css': {
        project: 'Build a CSS animation showcase: Flexbox, Grid, transitions, keyframes, responsive design.',
        learning: 'CSS fundamentals → Flexbox/Grid → Animations → CSS-in-JS or preprocessors',
        howToFix: 'Create repos with custom CSS. Show responsive design and modern layout techniques.'
    },
    'tailwind css': {
        project: 'Build a UI component library with Tailwind: Buttons, cards, modals, fully responsive.',
        learning: 'Tailwind docs → Utility-first approach → Component extraction → Theme customization',
        howToFix: 'Add tailwind.config.js to repos. Show consistent utility class usage.'
    },
    'bootstrap': {
        project: 'Build a responsive dashboard with Bootstrap: Grid system, components, customization.',
        learning: 'Bootstrap grid → Components → Customizing with SASS → Migration to v5',
        howToFix: 'Create repos using Bootstrap. Show proper grid usage and component customization.'
    },
    'mern stack': {
        project: 'Build a full MERN app: Auth, CRUD, API, MongoDB, React frontend, deploy both ends.',
        learning: 'Learn each part individually → Integrate → Build one complete project → Deploy',
        howToFix: 'Create a repo with both frontend and backend. Show full-stack integration.'
    },
    'machine learning': {
        project: 'Build and deploy an ML model: Data preprocessing, training, evaluation, Flask/FastAPI endpoint.',
        learning: 'Python basics → pandas/numpy → scikit-learn → Build 3 ML projects → Deploy on Hugging Face',
        howToFix: 'Create ML repos with notebooks and scripts. Include datasets or data sources.'
    }
};

const DEFAULT_RECOMMENDATION = {
    project: 'Build a project that demonstrates this skill clearly with documentation.',
    learning: 'Find a course or tutorial → Practice with 2-3 projects → Document your learning',
    howToFix: 'Create public repos showing this skill. Write clear READMEs.'
};

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
        const skillRec = SKILL_RECOMMENDATIONS[lowerSkill] || DEFAULT_RECOMMENDATION;

        // Check if skill appears in languages
        const inLanguages = this.githubLanguages.includes(lowerSkill);

        // Check if skill appears in repo names
        const inRepoNames = this.repoNames.some(name => name.includes(lowerSkill));

        // Determine evidence strength
        let evidenceStrength: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' = 'NONE';
        let githubEvidence = 'No evidence found in GitHub';
        let verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT' = 'FRAUDULENT';
        let recommendation = '';
        let projectIdea: string | undefined;
        let learningPath: string | undefined;
        let howToFix: string | undefined;

        if (inLanguages && inRepoNames) {
            evidenceStrength = 'STRONG';
            githubEvidence = `Used in projects and listed as primary language`;
            verdict = 'VERIFIED';
            recommendation = '✅ SOLID! Prepare 2-3 specific examples with metrics (lines of code, users, impact).';
        } else if (inLanguages) {
            evidenceStrength = 'MODERATE';
            githubEvidence = `Found as primary language in repos`;
            verdict = 'VERIFIED';
            recommendation = '✅ Good evidence. Be ready to discuss specific projects and code patterns you used.';
        } else if (inRepoNames) {
            evidenceStrength = 'WEAK';
            githubEvidence = `Mentioned in repo names only`;
            verdict = 'WEAK_SUPPORT';
            recommendation = '⚠️ Weak evidence. Build a substantial project or consider removing this claim.';
            projectIdea = skillRec.project;
            learningPath = skillRec.learning;
            howToFix = skillRec.howToFix;
        } else {
            evidenceStrength = 'NONE';
            githubEvidence = 'No evidence in GitHub';
            verdict = 'OVERCLAIMED';
            recommendation = '❌ DANGER! Remove this OR build proof immediately. Interviewers WILL test you.';
            projectIdea = skillRec.project;
            learningPath = skillRec.learning;
            howToFix = skillRec.howToFix;
        }

        return {
            skill,
            claimed: true,
            githubEvidence,
            evidenceStrength,
            verdict,
            recommendation,
            projectIdea,
            learningPath,
            howToFix
        };
    }

    verifyAllClaims(claims: string[]): VerificationResult[] {
        return claims.map(claim => this.verifyClaim(claim));
    }

    getSummary(results: VerificationResult[]) {
        const verified = results.filter(r => r.verdict === 'VERIFIED').length;
        const weakSupport = results.filter(r => r.verdict === 'WEAK_SUPPORT').length;
        const overclaimed = results.filter(r => r.verdict === 'OVERCLAIMED').length;

        // Get top priorities to fix
        const priorityFixes = results
            .filter(r => r.verdict === 'OVERCLAIMED')
            .slice(0, 3)
            .map(r => ({
                skill: r.skill,
                projectIdea: r.projectIdea,
                howToFix: r.howToFix
            }));

        return {
            totalClaims: results.length,
            verified,
            weakSupport,
            overclaimed,
            honestyScore: results.length > 0 ? Math.round((verified / results.length) * 100) : 0,
            risk: overclaimed > 0 ? 'HIGH' : (weakSupport > verified ? 'MODERATE' : 'LOW'),
            priorityFixes,
            actionPlan: this.generateActionPlan(results)
        };
    }

    private generateActionPlan(results: VerificationResult[]): string[] {
        const plan: string[] = [];
        const overclaimed = results.filter(r => r.verdict === 'OVERCLAIMED');
        const weak = results.filter(r => r.verdict === 'WEAK_SUPPORT');

        if (overclaimed.length > 0) {
            plan.push(`🚨 URGENT: Remove or build proof for ${overclaimed.length} overclaimed skills`);
            plan.push(`📌 Top priority: ${overclaimed.slice(0, 3).map(r => r.skill).join(', ')}`);
        }

        if (weak.length > 0) {
            plan.push(`⚠️ Strengthen ${weak.length} weak claims with projects`);
        }

        if (overclaimed.length > 3) {
            plan.push(`💡 Focus on 2-3 skills max. Better to be strong in few than weak in many.`);
        }

        if (results.filter(r => r.verdict === 'VERIFIED').length === 0) {
            plan.push(`🔴 CRITICAL: No verified skills! Start building public projects immediately.`);
        }

        return plan;
    }
}

