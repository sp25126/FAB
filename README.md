# FAB - Brutal Truth Resume Agent 🔥

**Your Resume. The Harsh Reality.**

FAB is an AI-powered resume verification system that exposes skill claims before interviewers do. It cross-references your resume against your GitHub profile to identify:
- ✅ **VERIFIED** skills with evidence
- ⚠️ **WEAK** claims needing work
- ❌ **OVERCLAIMED** skills to remove
- 🤖 **THE INTERROGATOR**: Dynamic project-based interview questions using RAG.

---

## 🚀 Quick Start

### Option 1: CLI (Recommended)
```bash
python run.py
```
1. Choose `1` for **Local** (Ollama) or `2` for **Cloud** (Colab GPU)
2. If Cloud: Enter your ngrok URL (see [SETUP.md](SETUP.md))
3. Enter path to your resume PDF
4. Get the **brutal truth**!

### Option 2: Direct API
```bash
# Start backend
cd backend && npm install && npm run dev

# Analyze resume
curl -X POST http://localhost:3000/verify-resume-file \
  -F "resume=@resume.pdf" \
  -F "username=your_github_username"
```

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| **Dual AI Brain** | Local Ollama OR Cloud GPU (Colab) |
| **Deep GitHub Intelligence** | **10x Depth**: Scans code, READMEs, and Dockerfiles across top 10 repos. |
| **RAG Scraper** | Discover real-world interview questions based on your specific projects. |
| **Brutal Scoring** | **40/40/20 Metric**: Accuracy, Depth, and Clarity analyzed by AI. |
| **Project Rotation** | 2 Strikes on a project = AI pivots to a new repo automatically. |
| **Auto Fallback** | If Cloud fails, falls back to Local |
| **Skill Extraction** | Languages, frameworks, tools, concepts from PDF |

---

## 📊 Sample Output

```json
{
  "claimsFound": 15,
  "verification": [
    {
      "skill": "react",
      "verdict": "OVERCLAIMED",
      "recommendation": "❌ DANGER! Remove or build proof.",
      "projectIdea": "Build a Task Manager with React + Redux",
      "learningPath": "React docs → 3 mini-projects → Redux → Deploy",
      "howToFix": "Create 2-3 public React repos with README"
    }
  ],
  "summary": {
    "honestyScore": 25,
    "risk": "HIGH",
    "actionPlan": [
      "🚨 URGENT: Remove or build proof for 11 overclaimed skills",
      "📌 Top priority: react, django, express"
    ]
  },
  "brutalTruth": "Your resume is mostly lies. Interviewers will catch this."
}
```

---

## 🏗️ Architecture

```
FAB/
├── backend/                # Node.js + TypeScript API
│   ├── data/               # Persistent JSON storage (Isolated from Nodemon)
│   └── src/
│       ├── server.ts       # Express server (10MB Payload support)
│       └── modules/
│           ├── llm/        # AI providers (Ollama, Remote)
│           ├── interview/  # RAG Questioner & Session logic
│           ├── resume/     # Parser, Verifier
│           └── github/     # GitHub API analyzer (Recursive deep scan)
├── tools/colab-brain/      # Google Colab GPU script
├── run.py                  # Highly resilient CLI interface
├── DIARY.md                # 600+ Line technical implementation diary
├── STATUS.md               # Phase-wise progress report
└── SETUP.md                # Environment & Colab setup guide
```

---

## 🔧 Configuration

### Environment Variables (`.env`)
```env
BRAIN_TYPE=local          # or "remote"
REMOTE_BRAIN_URL=         # ngrok URL for Colab
OLLAMA_MODEL=gemma:2b     # Local LLM model
```

### Brain Types
| Type | Description | Speed |
|------|-------------|-------|
| `local` | Ollama on your machine | ~50s |
| `remote` | Colab GPU via ngrok | ~20s |

---

## 📖 Documentation

- [SETUP.md](SETUP.md) - Colab GPU brain setup
- [report.md](report.md) - Development journey & bug fixes

---

## 🛠️ Tech Stack

- **Backend:** Node.js, TypeScript, Express
- **AI:** Ollama (gemma:2b), Colab GPU (Qwen2.5-1.5B)
- **PDF:** pdf-parse
- **API:** GitHub REST API

---

## 📈 Roadmap

- [x] Phase 1: Core resume verification
- [x] Dual brain support (Local + Cloud)
- [x] Enhanced skill recommendations
- [x] Fallback system
- [x] **Phase 2: Deep Intelligence & Interrogation**
    - [x] Recursive GitHub Analysis
    - [x] RAG-based Question Discovery
    - [x] Project Rotation & Strike System
- [ ] Phase 3: Desktop UI (Flet Dashboard)
- [ ] Phase 4: Resume rewriting suggestions

---

## 📄 License

MIT License - Use responsibly. Don't fake interviews, fix your skills! 💪
