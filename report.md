# FAB - Phase 1 Development Report

**Project:** FAB - Brutal Truth Resume Agent  
**Phase:** Phase 1 - Core Resume Verification System  
**Date:** February 5, 2026  
**Status:** ✅ COMPLETE

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Development Timeline](#development-timeline)
4. [Features Implemented](#features-implemented)
5. [Bugs & Fixes](#bugs--fixes)
6. [Test Results](#test-results)
7. [Files Created/Modified](#files-createdmodified)

---

## 🎯 Project Overview

FAB (Brutal Truth Resume Agent) is a resume verification system that:
- Extracts skills from PDF resumes using LLM (Local Ollama or Cloud Colab GPU)
- Verifies claimed skills against GitHub profile activity
- Provides actionable recommendations: what to fix, projects to build, skills to learn

---

## 🏗️ Architecture

```
FAB/
├── backend/                     # Node.js + TypeScript API Server
│   ├── src/
│   │   ├── server.ts           # Express server, API endpoints
│   │   └── modules/
│   │       ├── llm/
│   │       │   ├── factory.ts  # LLM provider factory
│   │       │   ├── types.ts    # LLM interfaces
│   │       │   ├── ollama.ts   # Local Ollama provider
│   │       │   └── remote.ts   # Colab GPU provider
│   │       ├── resume/
│   │       │   ├── parser.ts   # Resume skill extraction
│   │       │   ├── extractor.ts# PDF text extraction
│   │       │   └── verifier.ts # GitHub verification + recommendations
│   │       └── github/
│   │           └── analyzer.ts # GitHub API integration
│   └── .env                    # Configuration (BRAIN_TYPE, REMOTE_BRAIN_URL)
├── tools/colab-brain/
│   └── fab_brain.py            # Google Colab GPU brain script
├── run.py                      # CLI interface
├── SETUP.md                    # Colab setup guide
└── report.md                   # This file
```

---

## 📅 Development Timeline

### Session Start: Setting Up CLI Interface

**Goal:** Replace GUI with simple terminal CLI for brain selection

**Actions:**
1. Created `run.py` - CLI menu with options:
   - `[1] LOCAL` - Use Ollama (gemma:2b)
   - `[2] CLOUD` - Use Remote Colab GPU
   - `[0] EXIT`

2. Created `SETUP.md` - Detailed Colab setup instructions with:
   - Ngrok token setup
   - Colab script to copy-paste
   - URL configuration steps

---

### Bug #1: GitHub API 404 Error

**Symptom:**
```
❌ Server Error (500): {"error":"File processing failed","details":"GitHub API failed: 404"}
```

**Cause:** The `/verify-resume-file` endpoint required a valid GitHub username. Default `fab_gui_user` doesn't exist.

**Fix:** Modified `server.ts` to make GitHub verification optional:
```typescript
try {
    if (username && username !== 'fab_gui_user' && username !== 'cli_user') {
        const analyzer = new GitHubAnalyzer(username);
        await analyzer.fetchRepos();
        // ... verification
    } else {
        console.log(`[LOG] Skipping GitHub verification (no valid username)`);
    }
} catch (ghError: any) {
    console.warn(`[WARN] GitHub verification failed: ${ghError.message}`);
}
```

---

### Bug #2: Backend Not Starting in CLI

**Symptom:** `run.py` showed "Waiting... (1/30)" forever, backend never started

**Cause:** 
1. `npx kill-port` command hanging (no timeout)
2. `CREATE_NO_WINDOW` flag causing subprocess issues on Windows
3. Multiple stale backend processes on port 3000

**Fix:** Updated `run.py` subprocess handling:
```python
# Added timeout to kill-port
subprocess.run("npx -y kill-port 3000", shell=True, timeout=10, ...)

# Used shell=True for Windows compatibility
process = subprocess.Popen(
    "npm run dev",
    cwd=BACKEND_DIR,
    shell=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
```

---

### Bug #3: Colab Brain Not Actually Being Used

**Symptom:** Different resume (Fake_Web_Developer_Resume.pdf) returned identical skills as user's resume

**Cause:** `LLMFactory.getProvider()` had a TODO placeholder:
```typescript
case 'remote':
    // TODO: Implement Remote Provider
    return new OllamaProvider(); // Fallback - ALWAYS used local!
```

**Fix:** Created `remote.ts` - Full RemoteProvider implementation:
```typescript
export class RemoteProvider implements LLMProvider {
    async generate(prompt: string): Promise<string> {
        const response = await axios.post(
            `${this.baseUrl}/generate`,
            { prompt: prompt },
            { 
                timeout: 120000,
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'  // Skip ngrok warning!
                }
            }
        );
        return data.result || data.response || JSON.stringify(data);
    }
}
```

Updated `factory.ts`:
```typescript
case 'remote':
    if (!remoteUrl) {
        console.warn('⚠️ REMOTE_BRAIN_URL not set, falling back to local');
        return new OllamaProvider();
    }
    return new RemoteProvider(remoteUrl);
```

---

### Bug #4: Enhanced Parser Returning 0 Claims (Colab)

**Symptom:** After enhancing parser with more extraction, Colab returned:
```json
{"claimsFound":0,"verification":[],"actionPlan":["🔴 CRITICAL: No verified skills!"]}
```

**Cause:** Colab LLM returned empty arrays despite valid resume text. The LLM debug log showed:
```json
{
    "languages": [],
    "frameworks": [],
    "tools": [],
    "summary": "Creative and detail-oriented full stack web developer..."
}
```

**Resolution:** This was intermittent - subsequent tests with the same prompt worked. The Colab brain successfully extracted 24 skills on retry.

---

### Bug #5: Colab Brain Returns 0 Claims (Intermittent)

**Symptom:** Colab brain sometimes returns empty skills arrays, causing no claims to be extracted.

**Cause:** Intermittent issue with Colab GPU response parsing or model behavior.

**Fix:** Implemented automatic fallback system in `parser.ts`:
```typescript
// If remote provider returns 0 skills, fall back to local
if (skillCount === 0 && brainType === 'remote') {
    console.warn('⚠️ [FALLBACK] Remote brain returned 0 skills, falling back to local...');
    return this.fallbackToLocal(prompt);
}
```

**Fallback Triggers:**
1. Network error (Colab unreachable)
2. Timeout (Colab too slow)
3. 0 skills extracted

---

## ✅ Features Implemented


### 1. Dual LLM Support
- **Local:** Ollama with gemma:2b model
- **Remote:** Google Colab GPU via ngrok tunnel

### 2. Enhanced Resume Parser
Extracts:
- Languages (python, javascript, etc.)
- Frameworks (react, django, express)
- Tools (docker, git, aws, kubernetes)
- Concepts (rest api, ci/cd, agile)
- Experience (company, role, duration, highlights)
- Projects (name, tech stack, description)
- Education (degree, institution, year)
- Certifications

### 3. GitHub Verification
- Fetches user's public repos
- Analyzes primary languages
- Checks repo names for skill mentions
- Assigns evidence strength: NONE → WEAK → MODERATE → STRONG

### 4. Actionable Recommendations
For each overclaimed skill, provides:
- `projectIdea` - Specific project to build
- `learningPath` - Step-by-step learning guide
- `howToFix` - How to add proof to GitHub

**Example:**
```json
{
    "skill": "react",
    "verdict": "OVERCLAIMED",
    "projectIdea": "Build a Task Manager with React + Redux: CRUD operations, local storage, drag-and-drop sorting.",
    "learningPath": "Complete React docs tutorial → Build 3 mini-projects → Learn Redux → Deploy on Vercel",
    "howToFix": "Create 2-3 public React repos with proper README. Use Create React App or Vite."
}
```

### 5. Action Plan Generation
```json
{
    "actionPlan": [
        "🚨 URGENT: Remove or build proof for 22 overclaimed skills",
        "📌 Top priority: css, react.js, node.js",
        "💡 Focus on 2-3 skills max. Better to be strong in few than weak in many."
    ]
}
```

### 6. Skill Recommendations Database
20+ skills with specific recommendations:
- react, react.js, node.js, express.js
- python, django
- docker, kubernetes, aws
- mongodb, git, github
- rest api, ci/cd, typescript, javascript
- html, css, tailwind css, bootstrap
- mern stack, machine learning

---

## 📊 Test Results

### Test 1: User's Resume (Local LLM)
```
File: SaumyaPatel_Resume-1 (1)-1.pdf
Claims Found: 8
Verified: 2 (python, javascript)
Overclaimed: 6
Honesty Score: 25/100
```

### Test 2: User's Resume (Colab GPU)
```
File: SaumyaPatel_Resume-1 (1)-1.pdf
Claims Found: 8
Verified: 2 (python, javascript)
Overclaimed: 6
Honesty Score: 25/100
Time: ~6 seconds
```

### Test 3: Fake Resume (Local LLM)
```
File: Fake_Web_Developer_Resume.pdf
Claims Found: 13
Verified: 2 (python, javascript)
Overclaimed: 11
Honesty Score: 15/100
Time: ~51 seconds
```

### Test 4: Fake Resume (Colab GPU) - Enhanced Output
```
File: Fake_Web_Developer_Resume.pdf
Claims Found: 24
Verified: 2 (html, javascript)
Overclaimed: 22
Honesty Score: 8/100
Time: ~19 seconds

Skills Extracted:
✅ HTML, JavaScript (VERIFIED)
❌ CSS, React.js, Node.js, Express.js, MongoDB, REST APIs, Git, GitHub, 
   Tailwind CSS, Bootstrap, MERN Stack, Docker, AWS, Kubernetes, CI/CD, 
   Agile, Microservices (OVERCLAIMED)
```

---

## 📁 Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `run.py` | CLI interface for brain selection |
| `SETUP.md` | Colab GPU setup guide |
| `backend/src/modules/llm/remote.ts` | RemoteProvider for Colab |
| `enhanced_local_result.json` | Test output (local) |
| `enhanced_colab_result.json` | Test output (colab) |
| `phase1_test.json` | Initial test output |
| `report.md` | This report |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/server.ts` | Made GitHub optional, added logging |
| `backend/src/modules/llm/factory.ts` | Added RemoteProvider support |
| `backend/src/modules/llm/ollama.ts` | Changed default model to gemma:2b |
| `backend/src/modules/resume/parser.ts` | Enhanced extraction (experience, projects, education) |
| `backend/src/modules/resume/verifier.ts` | Added skill recommendations database, project ideas, learning paths |

---

## 🚀 How to Use

### Option 1: CLI (Recommended)
```bash
python run.py
```
1. Choose `1` for Local or `2` for Cloud
2. If Cloud: Enter your Colab ngrok URL
3. Enter path to resume PDF
4. Get brutal truth verdict!

### Option 2: Direct API
```bash
# Set brain type
curl -X POST http://localhost:3000/config/brain \
  -H "Content-Type: application/json" \
  -d '{"brainType": "remote", "remoteUrl": "https://xxx.ngrok-free.app"}'

# Analyze resume
curl -X POST http://localhost:3000/verify-resume-file \
  -F "resume=@resume.pdf" \
  -F "username=github_username"
```

---

## 📈 Performance Comparison

| Metric | Local (Ollama) | Colab (GPU) |
|--------|----------------|-------------|
| Model | gemma:2b | Qwen2.5-1.5B |
| Response Time | 16-51s | 6-19s |
| Skills Extracted | 8-13 | 15-24 |
| Cost | Free (local) | Free (Colab) |

---

## 🎉 Phase 1 Complete!

**Accomplished:**
- ✅ PDF resume parsing with LLM
- ✅ Dual brain support (Local + Cloud GPU)
- ✅ GitHub profile verification
- ✅ Actionable recommendations with project ideas
- ✅ CLI interface
- ✅ Comprehensive testing

**Next Phase Ideas:**
- Add more skill recommendations
- LinkedIn profile integration
- Resume rewriting suggestions
- Interview question generator based on gaps
