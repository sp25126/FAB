# FAB Unified Analyzer System: Technical Implementation Specification

## Executive Summary

This document outlines the integration strategy for merging FAB's GitHub Analyzer and Resume Verifier into a unified "Analyzer" module that performs deep, correlated analysis using shared data structures for maximum efficiency and insight generation.

---

## 1. System Architecture Overview

### 1.1 Current State Analysis

**Existing Modules:**
- **GitHub Analyzer** (`backend/src/github/analyzer.ts`): Fetches repository metadata, performs code analysis, extracts tech stack
- **Resume Parser** (`backend/src/modules/resume/parser.ts`): Extracts skills and claims from resume text using AI and regex
- **Resume Verifier** (`backend/src/modules/resume/verifier.ts`): Cross-references resume claims against GitHub evidence

**Critical Gap:**
Currently, these modules operate sequentially with minimal data sharing, causing:
- Redundant API calls to GitHub
- Separate AI inference passes for similar data
- Inconsistent skill taxonomy between resume and GitHub analysis
- No unified scoring methodology

### 1.2 Proposed Unified Architecture

**Core Principle:** Single Deep Search Session → Comprehensive Multi-Dimensional Report

┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED ANALYZER                          │
│                                                              │
│  ┌───────────────┐        ┌───────────────┐                 │
│  │   Data Ingest │        │  Correlation  │                 │
│  │               │───────▶│    Engine     │                 │
│  │ • GitHub Auth │        │               │                 │
│  │ • Resume PDF  │        │ • Skill Match │                 │
│  └───────────────┘        │ • Claim Verify│                 │
│                           │ • Gap Detection│                 │
│                           └───────┬───────┘                 │
│                                   │                         │
│                                   ▼                         │
│                           ┌───────────────┐                 │
│                           │  AI Synthesis │                 │
│                           │               │                 │
│                           │ • Deep Scoring│                 │
│                           │ • Explanations│                 │
│                           └───────┬───────┘                 │
│                                   │                         │
│                                   ▼                         │
│                           ┌───────────────┐                 │
│                           │ Unified Report│                 │
│                           │   Generator   │                 │
│                           └───────────────┘                 │
└─────────────────────────────────────────────────────────────┘

---

## 2. Implementation Phases

### Phase 1: User Authentication & Token Acquisition

**Objective:** Guide users to obtain GitHub Personal Access Token for deep analysis

**Implementation Steps:**

#### Step 2.1: Frontend Token Acquisition UI

**Location:** `frontend/src/pages/Analyzer.tsx` (new unified page)

**UI Components:**

1. **Token Setup Card** (Always Visible Until Token Provided)
   - Collapsible instruction panel
   - Step-by-step visual guide
   - Copy-paste friendly commands
   - Token validation indicator

**Visual Design:**
╔═══════════════════════════════════════════════════════════╗
║  🔐 GitHub Authentication Required                        ║
║                                                           ║
║  ⚠️  Deep analysis requires GitHub access token          ║
║                                                           ║
║  📋 Steps to Generate Token:                             ║
║                                                           ║
║  1️⃣  Visit: https://github.com/settings/tokens/new       ║
║     [Copy URL] 🔗                                         ║
║                                                           ║
║  2️⃣  Token Name: "FAB Analyzer"                          ║
║                                                           ║
║  3️⃣  Required Scopes:                                     ║
║     ☑ repo (Full control of private repos)              ║
║     ☑ read:user (Read user profile data)                ║
║     ☑ user:email (Access user email)                    ║
║                                                           ║
║  4️⃣  Expiration: 90 days (recommended)                   ║
║                                                           ║
║  5️⃣  Click "Generate token" and copy immediately        ║
║                                                           ║
║  ┌─────────────────────────────────────────────────┐    ║
║  │ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx        │    ║
║  │                                        [Paste]  │    ║
║  └─────────────────────────────────────────────────┘    ║
║                                                           ║
║  [Validate & Proceed] ────────────────────────────►      ║
╚═══════════════════════════════════════════════════════════╝

**Backend Validation Endpoint:**
// POST /api/v1/analyzer/validate-token
interface ValidateTokenRequest {
  token: string;
  username?: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  scopes: string[];
  rateLimit: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
  username: string;
  error?: string;
}

#### Step 2.2: Secure Token Storage

**Security Requirements:**
- **Never** store plain tokens in localStorage
- Use session-based encryption with backend
- Provide "Remember for 24h" option with encrypted cookie
- Clear warning about token sensitivity

**Backend Implementation:**
// backend/src/modules/auth/token-manager.ts
import crypto from 'crypto';

class TokenManager {
  private readonly ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!;
  private readonly IV_LENGTH = 16;

  encryptToken(token: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY, 'hex'),
      iv
    );
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final()
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY, 'hex'),
      iv
    );
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  }
}

---

### Phase 2: Unified Deep Search Orchestrator

**Objective:** Single analysis pass that gathers all required data efficiently

#### Step 2.1: Data Collection Strategy

**Parallel Execution Plan:**
┌──────────────────┐
│  User Trigger    │
│  • Token         │
│  • Resume File   │
│  • Username      │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────┐
│   DEEP SEARCH COORDINATOR          │
│                                    │
│  Promise.allSettled([              │
│    fetchGitHubRepos(),             │ ◄── Parallel Execution
│    parseResumeWithAI(),            │
│    fetchGitHubProfile(),           │
│    fetchContributionActivity()     │
│  ])                                │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│   DATA NORMALIZATION               │
│   • Unified Skill Taxonomy         │
│   • Timestamp Alignment            │
│   • Confidence Scoring             │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│   CORRELATION ENGINE               │
│   • Match Resume ↔ GitHub          │
│   • Detect Overclaiming            │
│   • Identify Hidden Skills         │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│   AI SYNTHESIS (Single Pass)       │
│   • Generate Explanations          │
│   • Calculate Composite Scores     │
│   • Produce Recommendations        │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│   REPORT GENERATION                │
└────────────────────────────────────┘

#### Step 2.2: Unified Data Model

**Core Database Schema:**
// backend/src/models/unified-analysis.ts

interface UnifiedAnalysis {
  id: string;
  userId: string;
  username: string;
  timestamp: Date;
  
  // Raw Data
  rawData: {
    resume: {
      text: string;
      extractedAt: Date;
      fileName: string;
    };
    github: {
      profile: GitHubProfile;
      repositories: Repository[];
      contributions: ContributionActivity;
      fetchedAt: Date;
    };
  };
  
  // Normalized Skills
  skills: UnifiedSkill[];
  
  // Correlation Results
  correlations: SkillCorrelation[];
  
  // Scoring
  scores: UnifiedScoreCard;
  
  // Metadata
  analysisMode: 'DEEP' | 'LIGHT';
  processingTimeMs: number;
  aiModelUsed: string;
}

interface UnifiedSkill {
  name: string;
  category: SkillCategory;
  
  // Evidence Sources
  evidenceSources: {
    resume: {
      found: boolean;
      mentions: number;
      contexts: string[]; // Sentences where mentioned
    };
    github: {
      found: boolean;
      repositories: string[]; // Repo names where used
      lineCount: number;
      lastUsed: Date;
      proficiencyIndicators: {
        complexity: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
        patterns: string[]; // Design patterns detected
        libraries: string[]; // Associated libraries
      };
    };
  };
  
  // Correlation Analysis
  verdict: 'PROVEN' | 'SUPPORTED' | 'CLAIMED_ONLY' | 'HIDDEN' | 'OVERCLAIMED';
  confidence: number; // 0-100
  explanation: string;
}

interface SkillCorrelation {
  skill: string;
  
  resumeClaim: {
    present: boolean;
    claimStrength: 'NONE' | 'MENTIONED' | 'HIGHLIGHTED' | 'EXPERTISE';
    claimText: string;
  };
  
  githubEvidence: {
    present: boolean;
    evidenceStrength: 'NONE' | 'TRIVIAL' | 'MODERATE' | 'STRONG';
    evidenceDetails: string[];
  };
  
  matchQuality: 'PERFECT' | 'GOOD' | 'WEAK' | 'CONTRADICTION';
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

interface UnifiedScoreCard {
  overall: number; // 0-100
  
  dimensions: {
    technicalDepth: ScoreDimension;
    portfolioQuality: ScoreDimension;
    resumeAccuracy: ScoreDimension;
    communicationClarity: ScoreDimension;
    growthTrajectory: ScoreDimension;
  };
  
  breakdown: {
    category: string;
    score: number;
    weight: number;
    explanation: string;
  }[];
}

interface ScoreDimension {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  explanation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

---

### Phase 3: Advanced Scoring Engine

**Objective:** Multi-dimensional scoring with transparent explanations

#### Step 3.1: Scoring Methodology

**Core Principles:**
1. **Evidence-Based:** Every score must be justifiable with specific data points
2. **Context-Aware:** Adjust expectations based on experience level (student vs. senior)
3. **Honest:** No inflation — reality-based assessment
4. **Actionable:** Every weakness must have a concrete improvement path

**Scoring Dimensions:**

**1. Technical Depth Score (Weight: 30%)**
function calculateTechnicalDepth(analysis: UnifiedAnalysis): ScoreDimension {
  const factors = {
    // Code Quality Indicators
    codeComplexity: analyzeCodeComplexity(analysis.rawData.github),
    architecturalPatterns: detectPatterns(analysis.rawData.github),
    errorHandling: assessErrorHandling(analysis.rawData.github),
    testing: evaluateTestCoverage(analysis.rawData.github),
    
    // Skill Depth
    advancedFeatureUsage: countAdvancedFeatures(analysis.skills),
    libraryDiversity: assessLibraryUsage(analysis.rawData.github),
    
    // Problem-Solving
    algorithmicComplexity: analyzeAlgorithmicWork(analysis.rawData.github),
    optimizationEvidence: detectOptimizations(analysis.rawData.github)
  };
  
  // Weighted calculation
  const score = (
    factors.codeComplexity * 0.20 +
    factors.architecturalPatterns * 0.25 +
    factors.errorHandling * 0.15 +
    factors.testing * 0.10 +
    factors.advancedFeatureUsage * 0.15 +
    factors.libraryDiversity * 0.10 +
    factors.algorithmicComplexity * 0.05
  );
  
  return {
    score,
    grade: scoreToGrade(score),
    explanation: generateExplanation(factors),
    strengths: identifyStrengths(factors),
    weaknesses: identifyWeaknesses(factors),
    recommendations: generateRecommendations(factors)
  };
}

**2. Portfolio Quality Score (Weight: 25%)**
function calculatePortfolioQuality(analysis: UnifiedAnalysis): ScoreDimension {
  const repos = analysis.rawData.github.repositories;
  
  const factors = {
    originalityRatio: calculateOriginalityRatio(repos),
    commitConsistency: analyzeCommitPatterns(analysis.rawData.github.contributions),
    projectCompletion: assessCompletionRate(repos),
    documentation: evaluateDocumentation(repos),
    realWorldApplicability: assessPracticalValue(repos),
    technicalAmbition: measureProjectAmbition(repos)
  };
  
  // Harsh reality check
  if (factors.originalityRatio < 0.3) {
    factors.originalityRatio *= 0.5; // Penalize heavily for boilerplate
  }
  
  const score = (
    factors.originalityRatio * 0.25 +
    factors.commitConsistency * 0.20 +
    factors.projectCompletion * 0.20 +
    factors.documentation * 0.15 +
    factors.realWorldApplicability * 0.15 +
    factors.technicalAmbition * 0.05
  );
  
  return buildScoreDimension(score, factors);
}

**3. Resume Accuracy Score (Weight: 20%)**
function calculateResumeAccuracy(analysis: UnifiedAnalysis): ScoreDimension {
  const correlations = analysis.correlations;
  
  const claimVerdict = {
    proven: correlations.filter(c => c.verdict === 'PROVEN').length,
    supported: correlations.filter(c => c.verdict === 'SUPPORTED').length,
    claimedOnly: correlations.filter(c => c.verdict === 'CLAIMED_ONLY').length,
    overclaimed: correlations.filter(c => c.verdict === 'OVERCLAIMED').length
  };
  
  const totalClaims = Object.values(claimVerdict).reduce((a, b) => a + b, 0);
  
  // Aggressive penalty for overclaiming
  const overclaimPenalty = (claimVerdict.overclaimed / totalClaims) * 50;
  
  const baseScore = (
    (claimVerdict.proven * 1.0 +
     claimVerdict.supported * 0.7 +
     claimVerdict.claimedOnly * 0.3) / totalClaims
  ) * 100;
  
  const finalScore = Math.max(0, baseScore - overclaimPenalty);
  
  return {
    score: finalScore,
    grade: scoreToGrade(finalScore),
    explanation: generateAccuracyExplanation(claimVerdict),
    strengths: identifyHonestClaims(correlations),
    weaknesses: identifyProblematicClaims(correlations),
    recommendations: generateClaimRecommendations(correlations)
  };
}

**4. Communication Clarity Score (Weight: 15%)**
function calculateCommunicationClarity(analysis: UnifiedAnalysis): ScoreDimension {
  const resume = analysis.rawData.resume.text;
  const repos = analysis.rawData.github.repositories;
  
  const factors = {
    resumeClarity: analyzeResumeLanguage(resume),
    technicalWriting: evaluateREADMEQuality(repos),
    codeComments: assessCommentQuality(repos),
    commitMessages: evaluateCommitMessages(analysis.rawData.github.contributions),
    projectDescriptions: scoreDescriptions(repos)
  };
  
  const score = (
    factors.resumeClarity * 0.30 +
    factors.technicalWriting * 0.25 +
    factors.codeComments * 0.20 +
    factors.commitMessages * 0.15 +
    factors.projectDescriptions * 0.10
  );
  
  return buildScoreDimension(score, factors);
}

**5. Growth Trajectory Score (Weight: 10%)**
function calculateGrowthTrajectory(analysis: UnifiedAnalysis): ScoreDimension {
  const contributions = analysis.rawData.github.contributions;
  
  const factors = {
    activityTrend: analyzeCommitTrend(contributions),
    skillDiversification: measureSkillBreadth(analysis.skills),
    complexityProgression: detectComplexityIncrease(analysis.rawData.github.repositories),
    learningVelocity: estimateLearningRate(contributions)
  };
  
  const score = (
    factors.activityTrend * 0.30 +
    factors.skillDiversification * 0.25 +
    factors.complexityProgression * 0.30 +
    factors.learningVelocity * 0.15
  );
  
  return buildScoreDimension(score, factors);
}

#### Step 3.2: AI-Powered Explanation Generation

**Prompt Engineering for Scoring Explanations:**

async function generateScoreExplanations(
  analysis: UnifiedAnalysis,
  scores: UnifiedScoreCard
): Promise<void> {
  const prompt = `
You are a brutally honest senior technical interviewer reviewing a candidate's profile.

CANDIDATE DATA:
- GitHub Username: ${analysis.username}
- Resume Skills: ${analysis.skills.map(s => s.name).join(', ')}
- GitHub Projects: ${analysis.rawData.github.repositories.length}
- Total Commits (6 months): ${getTotalCommits(analysis)}

SCORING RESULTS:
- Overall: ${scores.overall}/100
- Technical Depth: ${scores.dimensions.technicalDepth.score}/100
- Portfolio Quality: ${scores.dimensions.portfolioQuality.score}/100
- Resume Accuracy: ${scores.dimensions.resumeAccuracy.score}/100

SKILL CORRELATIONS:
${analysis.correlations.map(c => `
  - ${c.skill}:
    Resume Claim: ${c.resumeClaim.claimStrength}
    GitHub Evidence: ${c.githubEvidence.evidenceStrength}
    Verdict: ${c.verdict}
    Risk Level: ${c.riskLevel}
`).join('\n')}

TASK:
For each scoring dimension, provide:
1. **Strengths** (2-3 specific, evidence-backed positives)
2. **Weaknesses** (2-3 brutal, specific gaps)
3. **Recommendations** (2-3 actionable next steps)

RULES:
- Be specific: Reference actual projects, commit patterns, code examples
- Be harsh: Don't sugarcoat. This is interview prep, not confidence building.
- Be actionable: Every weakness must have a concrete fix
- Use numbers: Quantify whenever possible

OUTPUT JSON:
{
  "technicalDepth": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "recommendations": ["...", "..."]
  },
  "portfolioQuality": { ... },
  "resumeAccuracy": { ... },
  "communicationClarity": { ... },
  "growthTrajectory": { ... }
}
`;

  const response = await llm.generateStructuredOutput(prompt);
  
  // Merge AI explanations with computed scores
  Object.keys(scores.dimensions).forEach(dimension => {
    scores.dimensions[dimension].strengths = response[dimension].strengths;
    scores.dimensions[dimension].weaknesses = response[dimension].weaknesses;
    scores.dimensions[dimension].recommendations = response[dimension].recommendations;
  });
}

---

### Phase 4: Advanced Report Visualization

**Objective:** Interactive, information-dense report UI with drill-down capabilities

#### Step 4.1: Report Structure

**Layout Hierarchy:**

┌─────────────────────────────────────────────────────────────┐
│                     ANALYZER REPORT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         OVERALL READINESS SCORE: 67/100            │    │
│  │                      Grade: B                      │    │
│  │                                                     │    │
│  │  ████████████████░░░░░░░░░░  67%                  │    │
│  │                                                     │    │
│  │  Interview-Ready: Needs Improvement                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  📊 SCORE BREAKDOWN                                │    │
│  │                                                     │    │
│  │  Technical Depth        72/100 ██████████░░  B+   │    │
│  │  Portfolio Quality      58/100 ████████░░░   C+   │    │
│  │  Resume Accuracy        45/100 ██████░░░░░   D    │    │
│  │  Communication          81/100 ████████████  A-   │    │
│  │  Growth Trajectory      69/100 █████████░░   B    │    │
│  │                                                     │    │
│  │  [View Detailed Breakdown ▼]                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  🔍 SKILL VERIFICATION MATRIX                       │    │
│  │                                                     │    │
│  │  ┌─────────┬───────────┬──────────┬──────────┐   │    │
│  │  │ Skill   │  Resume   │  GitHub  │ Verdict  │   │    │
│  │  ├─────────┼───────────┼──────────┼──────────┤   │    │
│  │  │ Python  │ EXPERTISE │ STRONG   │ ✅ PROVEN│   │    │
│  │  │ React   │ HIGHLIGHT │ MODERATE │ ✓ SUPPORT│   │    │
│  │  │ Docker  │ MENTIONED │ TRIVIAL  │ ⚠ WEAK   │   │    │
│  │  │ K8s     │ HIGHLIGHT │ NONE     │ ❌ REMOVE│   │    │
│  │  └─────────┴───────────┴──────────┴──────────┘   │    │
│  │                                                     │    │
│  │  [Click any skill for detailed analysis]          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ⚠️  CRITICAL ISSUES                                │    │
│  │                                                     │    │
│  │  🔴 HIGH RISK (3)                                  │    │
│  │     • Kubernetes: No evidence despite resume claim │    │
│  │     • Microservices: Only tutorial code detected   │    │
│  │     • System Design: No architectural work visible │    │
│  │                                                     │    │
│  │  🟡 MEDIUM RISK (2)                                │    │
│  │     • Docker: Minimal usage (only Dockerfile copy) │    │
│  │     • Redis: Single basic implementation           │    │
│  │                                                     │    │
│  │  [View Recommendations →]                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  💪 HIDDEN STRENGTHS                               │    │
│  │                                                     │    │
│  │  Skills found in GitHub but missing from resume:   │    │  │  • TypeScript: Advanced usage in 5 projects        │    │
│  │  • Git Workflows: Complex branching strategies     │    │
│  │  • Error Handling: Comprehensive patterns          │    │
│  │                                                     │    │
│  │  [Add to Resume Suggestions →]                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

#### Step 4.2: Interactive Drill-Down UI

**Skill Detail Modal:**

When user clicks any skill in the verification matrix:

╔═════════════════════════════════════════════════════════════╗
║  Python                                   [✕]                ║
║                                                              ║
║  Overall Verdict: ✅ PROVEN              Confidence: 92%    ║
║  ──────────────────────────────────────────────────────────║
║                                                              ║
║  📄 RESUME EVIDENCE                                         ║
║  ─────────────────                                          ║
║  Claim Strength: EXPERTISE                                  ║
║                                                              ║
║  Mentions (4):                                              ║
║  • "Built REST API using Python/FastAPI"                   ║
║  • "Automated data processing pipeline in Python"          ║
║  • "Skills: Python, Django, Flask, FastAPI"                ║
║  • "3 years Python development experience"                 ║
║                                                              ║
║  💻 GITHUB EVIDENCE                                         ║
║  ─────────────────                                          ║
║  Evidence Strength: STRONG                                  ║
║                                                              ║
║  Projects Using Python (7):                                ║
║  ┌─────────────────────────────────────────┐              ║
║  │ FAB (Backend)           Last: 2 days ago │              ║
║  │ ├─ Lines of Code: 2,847                 │              ║
║  │ ├─ Complexity: ADVANCED                 │              ║
║  │ ├─ Patterns Detected:                   │              ║
║  │ │  • Async/Await                        │              ║
║  │ │  • Dependency Injection                │              ║
║  │ │  • Error Handling Middleware          │              ║
║  │ └─ Libraries: FastAPI, SQLAlchemy, Pydantic            ║
║  └─────────────────────────────────────────┘              ║
║                                                              ║
║  ┌─────────────────────────────────────────┐              ║
║  │ business-management    Last: 3 weeks ago │              ║
║  │ ├─ Lines of Code: 1,523                 │              ║
║  │ ├─ Complexity: INTERMEDIATE             │              ║
║  │ ├─ Patterns: MVC, Database ORM          │              ║
║  │ └─ Libraries: Django, PostgreSQL        │              ║
║  └─────────────────────────────────────────┘              ║
║                                                              ║
║  [Show All 7 Projects ▼]                                   ║
║                                                              ║
║  📊 PROFICIENCY ANALYSIS                                    ║
║  ─────────────────────                                      ║
║  Code Quality:           ████████░░ 85/100                 ║
║  Modern Practices:       ███████░░░ 72/100                 ║
║  Error Handling:         ████████░░ 81/100                 ║
║  Testing:                ████░░░░░░ 42/100  ⚠️             ║
║                                                              ║
║  ✅ VERDICT EXPLANATION                                     ║
║  ───────────────────────                                    ║
║  "Strong evidence supports resume claim. Candidate has      ║
║   demonstrable experience across multiple projects with     ║
║   advanced patterns. Code quality is consistently high.     ║
║   However, testing coverage is weak—recommend adding        ║
║   pytest examples to strengthen credibility."               ║
║                                                              ║
║  📌 RECOMMENDATION                                          ║
║  ─────────────────                                          ║
║  ▸ Keep this skill prominent in resume                     ║
║  ▸ Add 'pytest' to technical skills section                ║
║  ▸ Mention specific FastAPI patterns in bullet points      ║
║                                                              ║
║  [Close]                                   [Export Detail] ║
╚═════════════════════════════════════════════════════════════╝

---

### Phase 5: Database Schema & Persistence

**Objective:** Efficient storage and retrieval of analysis results

#### Step 5.1: SQLite Schema Extension

-- New unified analysis table
CREATE TABLE unified_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Raw Data (JSON)
  resume_data TEXT, -- JSON: { text, fileName, extractedAt }
  github_data TEXT, -- JSON: { profile, repos, contributions }
  
  -- Processing Metadata
  analysis_mode TEXT CHECK(analysis_mode IN ('DEEP', 'LIGHT')),
  processing_time_ms INTEGER,
  ai_model_used TEXT,
  
  -- Scores (JSON)
  scores TEXT, -- UnifiedScoreCard JSON
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Unified skills table (replaces separate resume/github skills)
CREATE TABLE unified_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  
  -- Resume Evidence
  resume_found BOOLEAN,
  resume_mentions INTEGER DEFAULT 0,
  resume_contexts TEXT, -- JSON array
  
  -- GitHub Evidence
  github_found BOOLEAN,
  github_repos TEXT, -- JSON array of repo names
  github_line_count INTEGER DEFAULT 0,
  github_last_used DATETIME,
  github_complexity TEXT CHECK(github_complexity IN ('BASIC', 'INTERMEDIATE', 'ADVANCED')),
  github_patterns TEXT, -- JSON array
  github_libraries TEXT, -- JSON array
  
  -- Correlation
  verdict TEXT CHECK(verdict IN ('PROVEN', 'SUPPORTED', 'CLAIMED_ONLY', 'HIDDEN', 'OVERCLAIMED')),
  confidence REAL CHECK(confidence BETWEEN 0 AND 100),
  explanation TEXT,
  
  FOREIGN KEY (analysis_id) REFERENCES unified_analyses(id)
);

-- Skill correlations table
CREATE TABLE skill_correlations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  
  -- Resume Claim
  resume_claim_present BOOLEAN,
  resume_claim_strength TEXT CHECK(resume_claim_strength IN ('NONE', 'MENTIONED', 'HIGHLIGHTED', 'EXPERTISE')),
  resume_claim_text TEXT,
  
  -- GitHub Evidence
  github_evidence_present BOOLEAN,
  github_evidence_strength TEXT CHECK(github_evidence_strength IN ('NONE', 'TRIVIAL', 'MODERATE', 'STRONG')),
  github_evidence_details TEXT, -- JSON array
  
  -- Match Analysis
  match_quality TEXT CHECK(match_quality IN ('PERFECT', 'GOOD', 'WEAK', 'CONTRADICTION')),
  risk_level TEXT CHECK(risk_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  recommendation TEXT,
  
  FOREIGN KEY (analysis_id) REFERENCES unified_analyses(id)
);

-- Indexes for performance
CREATE INDEX idx_unified_analyses_user ON unified_analyses(user_id);
CREATE INDEX idx_unified_analyses_username ON unified_analyses(username);
CREATE INDEX idx_unified_skills_analysis ON unified_skills(analysis_id);
CREATE INDEX idx_unified_skills_verdict ON unified_skills(verdict);
CREATE INDEX idx_skill_correlations_analysis ON skill_correlations(analysis_id);
CREATE INDEX idx_skill_correlations_risk ON skill_correlations(risk_level);

---

### Phase 6: API Endpoints Specification

**Objective:** RESTful API for unified analyzer operations

#### Step 6.1: Core Endpoints

**POST /api/v1/analyzer/deep-search**

Initiates unified deep analysis.

interface DeepSearchRequest {
  username: string;
  token: string;
  resumeFile: File; // multipart/form-data
  options?: {
    includePrivateRepos?: boolean;
    maxReposToAnalyze?: number; // default: 10
    skipCache?: boolean;
  };
}

interface DeepSearchResponse {
  analysisId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: {
    phase: string;
    percentage: number;
    currentTask: string;
  };
  estimatedCompletionMs: number;
}

**GET /api/v1/analyzer/status/:analysisId**

Poll for analysis progress.

interface AnalysisStatusResponse {
  analysisId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: {
    phase: 'FETCHING_GITHUB' | 'PARSING_RESUME' | 'CORRELATING' | 'SCORING' | 'GENERATING_REPORT';
    percentage: number;
    currentTask: string;
    logs: string[];
  };
  result?: UnifiedAnalysis; // Only present when status === 'COMPLETED'
  error?: string; // Only present when status === 'FAILED'
}

**GET /api/v1/analyzer/report/:analysisId**

Retrieve full analysis report.

interface AnalysisReportResponse extends UnifiedAnalysis {
  // Full UnifiedAnalysis object with all nested data
  
  // Additional computed fields
  metadata: {
    generatedAt: Date;
    version: string;
    expiresAt: Date;
  };
}

**GET /api/v1/analyzer/skill/:analysisId/:skillName**

Get detailed drill-down for specific skill.

interface SkillDetailResponse {
  skill: UnifiedSkill;
  correlation: SkillCorrelation;
  
  // Additional context
  similarSkills: string[]; // Related skills user has
  industryBenchmark: {
    averageGitHubUsage: number;
    commonPatterns: string[];
  };
  improvementResources: {
    type: 'TUTORIAL' | 'PROJECT' | 'DOCUMENTATION';
    title: string;
    url: string;
  }[];
}

#### Step 6.2: WebSocket Real-Time Updates

For long-running deep analysis, provide real-time progress updates:

// Client-side connection
const ws = new WebSocket('ws://localhost:3000/analyzer/stream/:analysisId');

ws.onmessage = (event) => {
  const update: AnalysisProgressUpdate = JSON.parse(event.data);
  
  // Update UI with progress
  updateProgressBar(update.percentage);
  showCurrentTask(update.currentTask);
  appendLog(update.logMessage);
};

interface AnalysisProgressUpdate {
  analysisId: string;
  phase: string;
  percentage: number;
  currentTask: string;
  logMessage: string;
  timestamp: Date;
}

---

### Phase 7: Error Handling & Edge Cases

**Objective:** Graceful degradation and informative error messages

#### Step 7.1: GitHub API Failure Scenarios

**Rate Limit Exceeded:**
if (response.status === 403 && response.headers['x-ratelimit-remaining'] === '0') {
  const resetTime = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);
  
  throw new AnalyzerError({
    code: 'GITHUB_RATE_LIMIT',
    message: 'GitHub API rate limit exceeded',
    details: {
      resetAt: resetTime,
      waitTimeMinutes: Math.ceil((resetTime.getTime() - Date.now()) / 60000)
    },
    userMessage: `GitHub rate limit reached. Analysis will resume in ${waitTimeMinutes} minutes.`,
    recovery: {
      action: 'RETRY_LATER',
      automaticRetry: true,
      retryAt: resetTime
    }
  });
}

**Invalid Token:**
if (response.status === 401) {
  throw new AnalyzerError({
    code: 'INVALID_GITHUB_TOKEN',
    message: 'GitHub token is invalid or expired',
    userMessage: 'Your GitHub token has expired or lacks required permissions.',
    recovery: {
      action: 'REGENERATE_TOKEN',
      instructions: [
        'Go to https://github.com/settings/tokens',
        'Delete existing FAB token',
        'Generate new token with repo + user:email scopes',
        'Paste new token in FAB'
      ]
    }
  });
}

**Private Repos Without Permission:**
if (response.status === 404 && expectedPrivateRepo) {
  // Graceful fallback: analyze only public repos
  logger.warn(`Cannot access private repos for ${username}. Analyzing public repos only.`);
  
  return {
    mode: 'PUBLIC_ONLY',
    warning: 'Analysis limited to public repositories. Add token for full analysis.'
  };
}

#### Step 7.2: Resume Parsing Failures

**Unreadable PDF:**
try {
  const text = await extractPDFText(resumeFile);
  
  if (!text || text.trim().length < 100) {
    throw new AnalyzerError({
      code: 'RESUME_EXTRACTION_FAILED',
      message: 'Could not extract text from resume',
      userMessage: 'Your resume appears to be an image-based PDF or is unreadable.',
      recovery: {
        action: 'PROVIDE_TEXT_VERSION',
        suggestions: [
          'Upload a text-based PDF (not scanned)',
          'Convert resume to Word document',
          'Copy-paste resume text directly'
        ]
      }
    });
  }
} catch (error) {
  // Fallback to manual text input
  return { mode: 'MANUAL_INPUT_REQUIRED' };
}

**AI Parsing Failure:**
try {
  const parsedData = await llm.parseResume(resumeText);
} catch (aiError) {
  logger.warn('AI parsing failed, falling back to regex extraction');
  
  // Regex fallback
  const fallbackData = regexBasedParsing(resumeText);
  
  return {
    ...fallbackData,
    warning: 'Advanced AI parsing unavailable. Using pattern-matching fallback.',
    confidence: 'LOW'
  };
}

---

### Phase 8: Testing & Validation Plan

**Objective:** Comprehensive testing before production deployment

#### Step 8.1: Unit Tests

**Critical Modules to Test:**

1. **Token Validation** (`backend/src/modules/auth/token-manager.test.ts`)
   - Encryption/decryption symmetry
   - Token expiry detection
   - Invalid token handling

2. **Skill Correlation Engine** (`backend/src/modules/analyzer/correlator.test.ts`)
   - Perfect match detection
   - Overclaim identification
   - Hidden skill discovery

3. **Scoring Algorithms** (`backend/src/modules/analyzer/scoring.test.ts`)
   - Score consistency across runs
   - Edge case handling (empty GitHub, minimal resume)
   - Weighted calculation accuracy

#### Step 8.2: Integration Tests

**End-to-End Flows:**

describe('Unified Analyzer E2E', () => {
  it('should complete full analysis with valid token and resume', async () => {
    const response = await request(app)
      .post('/api/v1/analyzer/deep-search')
      .attach('resumeFile', './test/fixtures/sample-resume.pdf')
      .field('username', 'test-user')
      .field('token', validGitHubToken);
    
    expect(response.status).toBe(202);
    expect(response.body.analysisId).toBeDefined();
    
    // Poll for completion
    let status;
    do {
      await delay(2000);
      status = await request(app)
        .get(`/api/v1/analyzer/status/${response.body.analysisId}`);
    } while (status.body.status === 'PROCESSING');
    
    expect(status.body.status).toBe('COMPLETED');
    expect(status.body.result.scores.overall).toBeGreaterThan(0);
  });
  
  it('should gracefully handle rate limit', async () => {
    // Mock GitHub API to return 403
    nock('https://api.github.com')
      .get(/.*/)
      .reply(403, {}, { 'x-ratelimit-remaining': '0' });
    
    const response = await request(app)
      .post('/api/v1/analyzer/deep-search')
      .attach('resumeFile', './test/fixtures/sample-resume.pdf')
      .field('username', 'test-user')
      .field('token', validGitHubToken);
    
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('GITHUB_RATE_LIMIT');
    expect(response.body.error.recovery).toBeDefined();
  });
});

#### Step 8.3: Performance Benchmarks

**Target Metrics:**

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Deep Analysis Completion | < 45 seconds | < 90 seconds |
| API Response Time (status check) | < 200ms | < 500ms |
| Report Generation | < 2 seconds | < 5 seconds |
| Database Query Time | < 50ms | < 200ms |
| WebSocket Latency | < 100ms | < 300ms |

---

## 3. Implementation Checklist

### Backend Tasks

- [ ] **Module: Token Manager** (`backend/src/modules/auth/token-manager.ts`)
  - [ ] Implement AES-256 encryption
  - [ ] Add token validation endpoint
  - [ ] Secure session storage

- [ ] **Module: Unified Analyzer** (`backend/src/modules/analyzer/unified-analyzer.ts`)
  - [ ] Parallel data collection
  - [ ] Data normalization layer
  - [ ] Correlation engine
  - [ ] Scoring algorithms

- [ ] **Module: Report Generator** (`backend/src/modules/analyzer/report-generator.ts`)
  - [ ] Structured report builder
  - [ ] AI explanation integration
  - [ ] Export functionality (PDF, JSON)

- [ ] **Database Schema** (`backend/src/db/migrations/`)
  - [ ] Create `unified_analyses` table
  - [ ] Create `unified_skills` table
  - [ ] Create `skill_correlations` table
  - [ ] Add indexes

- [ ] **API Endpoints** (`backend/src/server.ts`)
  - [ ] POST `/analyzer/deep-search`
  - [ ] GET `/analyzer/status/:id`
  - [ ] GET `/analyzer/report/:id`
  - [ ] GET `/analyzer/skill/:id/:name`
  - [ ] WebSocket `/analyzer/stream/:id`

- [ ] **Error Handling**
  - [ ] GitHub rate limit handling
  - [ ] Token expiry detection
  - [ ] Resume parsing fallbacks

### Frontend Tasks

- [ ] **Page: Analyzer** (`frontend/src/pages/Analyzer.tsx`)
  - [ ] Token setup UI
  - [ ] Resume upload interface
  - [ ] Real-time progress display

- [ ] **Component: Report Viewer** (`frontend/src/components/analyzer/ReportViewer.tsx`)
  - [ ] Overall score display
  - [ ] Dimension breakdown chart
  - [ ] Skill verification matrix
  - [ ] Critical issues panel
  - [ ] Hidden strengths section

- [ ] **Component: Skill Detail Modal** (`frontend/src/components/analyzer/SkillDetailModal.tsx`)
  - [ ] Resume evidence section
  - [ ] GitHub evidence section
  - [ ] Proficiency analysis
  - [ ] Recommendation display

- [ ] **Service: Analyzer API Client** (`frontend/src/api/analyzer.ts`)
  - [ ] `startDeepSearch()`
  - [ ] `pollStatus()`
  - [ ] `getReport()`
  - [ ] `getSkillDetail()`
  - [ ] WebSocket connection management

- [ ] **UI/UX Enhancements**
  - [ ] Loading animations
  - [ ] Error state displays
  - [ ] Responsive design
  - [ ] Accessibility (ARIA labels)

### Testing Tasks

- [ ] **Unit Tests**
  - [ ] Token manager tests
  - [ ] Correlation engine tests
  - [ ] Scoring algorithm tests

- [ ] **Integration Tests**
  - [ ] Full analysis flow
  - [ ] Rate limit handling
  - [ ] Invalid token handling
  - [ ] Resume parsing failures

- [ ] **Performance Tests**
  - [ ] Benchmark deep analysis time
  - [ ] Stress test concurrent analyses
  - [ ] Database query optimization

### Documentation Tasks

- [ ] **User Guides**
  - [ ] Token generation walkthrough
  - [ ] Report interpretation guide
  - [ ] FAQ section

- [ ] **Developer Docs**
  - [ ] API endpoint documentation
  - [ ] Database schema reference
  - [ ] Scoring methodology explanation

---

## 4. Migration Strategy

### Backward Compatibility

**Goal:** Preserve existing user data while transitioning to unified system

**Steps:**

1. **Data Migration Script** (`backend/scripts/migrate-to-unified.ts`)
   async function migrateToUnifiedAnalyses() {
     const oldAnalyses = await db.all('SELECT * FROM github_analyses');
     const oldResumes = await db.all('SELECT * FROM resume_analyses');
     
     for (const oldData of oldAnalyses) {
       // Find matching resume analysis
       const resume = oldResumes.find(r => 
         r.github_analysis_id === oldData.id
       );
       
       if (!resume) continue;
       
       // Create unified analysis
       const unifiedAnalysis: UnifiedAnalysis = {
         id: generateUUID(),
         userId: oldData.user_id,
         username: oldData.username,
         timestamp: oldData.analyzed_at,
         rawData: {
           github: extractGitHubData(oldData),
           resume: extractResumeData(resume)
         },
         // ... migrate rest of data
       };
       
       await saveUnifiedAnalysis(unifiedAnalysis);
     }
   }

2. **Deprecation Plan**
   - Keep old endpoints functional for 30 days
   - Add deprecation warnings to responses
   - Provide migration guide for API consumers

3. **Rollback Safety**
   - Maintain old tables until migration verified
   - Add `migrated` flag to old records
   - Keep backups of pre-migration data

---

## 5. Success Metrics

### Quantitative Metrics

**System Performance:**
- Deep analysis completion time: < 45 seconds (90th percentile)
- API error rate: < 2%
- Database query time: < 50ms (95th percentile)

**User Engagement:**
- Analysis completion rate: > 85%
- Report interaction time: > 3 minutes (indicates thorough reading)
- Skill drill-down usage: > 60% of users

**Accuracy:**
- Skill correlation accuracy: > 90% (validated against manual review)
- Overclaim detection precision: > 85%
- False positive rate: < 10%

### Qualitative Metrics

**User Feedback:**
- "This helped me fix my resume before sending applications"
- "I discovered skills I didn't even realize I had"
- "The scoring is harsh but fair—exactly what I needed"

**Use Cases Enabled:**
- Resume optimization before job applications
- GitHub portfolio audit for self-assessment
- Pre-interview preparation with realistic expectations

---

## 6. Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Comparative Analysis**
   - Compare user's profile against job descriptions
   - Benchmark against industry standards
   - Track improvement over time

2. **AI Interview Simulator Integration**
   - Use analyzer data to generate personalized interview questions
   - Focus drilling on weak skill areas
   - Track progress from initial analysis to post-training

3. **Collaborative Features**
   - Share anonymized reports with mentors
   - Peer comparison (opt-in)
   - Team skill assessment for hiring managers

4. **Advanced Insights**
   - Skill trend analysis (emerging vs. declining technologies)
   - Learning path recommendations
   - Project idea generator based on skill gaps

---

## 7. Appendix

### A. Sample Prompt for AI Synthesis

You are FAB's analysis engine, conducting a brutally honest assessment of a software engineer's readiness for technical interviews.

CANDIDATE PROFILE:
Username: ${username}
Experience Level: ${experienceLevel}
Target Roles: ${targetRoles.join(', ')}

GITHUB ANALYSIS:
- Total Repositories: ${repoCount}
- Primary Languages: ${languages.join(', ')}
- Commit Frequency: ${commitFrequency}
- Project Originality: ${originalityScore}/100
- Code Complexity: ${complexityScore}/100

RESUME CLAIMS:
${skills.map(s => `- ${s.name}: ${s.resumeClaimStrength}`).join('\n')}

SKILL CORRELATIONS:
${correlations.map(c => `
- ${c.skill}:
  Resume: ${c.resumeClaim.claimStrength}
  GitHub: ${c.githubEvidence.evidenceStrength}
  Match: ${c.matchQuality}
  Risk: ${c.riskLevel}
`).join('\n')}

TASK:
Generate a comprehensive assessment with:

1. **Overall Verdict** (1-2 sentences)
   - Interview-ready? Needs improvement? Not ready?

2. **Technical Depth Analysis**
   - Strengths: 2-3 specific, evidence-backed points
   - Weaknesses: 2-3 brutal, actionable gaps
   - Recommendations: 2-3 concrete next steps

3. **Resume Credibility Check**
   - Honest claims to highlight
   - Dangerous overclaims to remove
   - Hidden skills to add

4. **Critical Issues** (if any)
   - High-risk claims that will fail under interview scrutiny
   - Immediate fixes required

5. **Growth Trajectory**
   - Positive trends observed
   - Areas of stagnation

RULES:
- Be specific: Cite actual projects, commit counts, code examples
- Be harsh: This is interview prep, not confidence building
- Be actionable: Every criticism must have a fix
- Use numbers: Quantify whenever possible
- Be honest: If they're not ready, say so clearly

OUTPUT FORMAT: JSON matching UnifiedScoreCard structure

### B. Database Query Examples

**Get user's latest analysis:**
SELECT * FROM unified_analyses
WHERE user_id = ?
ORDER BY timestamp DESC
LIMIT 1;

**Find all high-risk skill claims:**
SELECT sc.skill, sc.risk_level, sc.recommendation
FROM skill_correlations sc
JOIN unified_analyses ua ON sc.analysis_id = ua.id
WHERE ua.user_id = ?
  AND sc.risk_level IN ('HIGH', 'CRITICAL')
ORDER BY sc.risk_level DESC;

**Get hidden skills (GitHub evidence but not in resume):**
SELECT us.skill_name, us.github_complexity, us.github_repos
FROM unified_skills us
JOIN unified_analyses ua ON us.analysis_id = ua.id
WHERE ua.user_id = ?
  AND us.github_found = 1
  AND us.resume_found = 0
  AND us.github_complexity IN ('INTERMEDIATE', 'ADVANCED')
ORDER BY us.github_line_count DESC;

### C. Error Codes Reference

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `GITHUB_RATE_LIMIT` | API rate limit exceeded | Retry after reset time |
| `INVALID_GITHUB_TOKEN` | Token expired or invalid | Regenerate token |
| `GITHUB_USER_NOT_FOUND` | Username doesn't exist | Verify username spelling |
| `RESUME_EXTRACTION_FAILED` | Cannot parse PDF | Upload text-based version |
| `AI_SERVICE_UNAVAILABLE` | LLM provider down | Fallback to regex parsing |
| `ANALYSIS_TIMEOUT` | Processing exceeded 5 minutes | Retry with smaller repo set |
| `INSUFFICIENT_DATA` | Not enough GitHub activity | Manual skill entry option |

---

## Document Metadata

**Version:** 1.0  
**Author:** FAB Development Team  
**Date:** February 10, 2026  
**Status:** Implementation Ready  
**Review Cycle:** Quarterly

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-10 | Initial specification | Development Team |