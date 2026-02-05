# FAB Technical Roadmap

## 🧠 Brain Architecture
- **Phase 1 (Done):** Hybrid implementation. `LLMFactory` switches between `OllamaProvider` (Local) and `RemoteProvider` (Colab).
- **Phase 2:** Enhanced Context. Feed mostly used GitHub languages into the LLM prompt to improve extraction accuracy.
- **Phase 3:** Fine-tuning. Fine-tune a small model (e.g., Llama-3-8B) on high-quality vs. low-quality resumes.

## ⚡ Core Features
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Resume Parsing | ✅ Done | High | Supported: PDF, TXT |
| GitHub Auth | ✅ Done | High | Public repos only |
| Skill Verification | ✅ Done | High | Repo name +Language matching |
| Project Recommender | ✅ Done | High | Curated list of 20+ skills |
| Auto-Scaffolding | 📅 Planned | Medium | script to generating `git init` projects |
| Interview Mode | 📅 Planned | Medium | Chatbot personas (Good Cop / Bad Cop) |

## 🖥️ Interfaces
- **CLI (`run.py`)**: ✅ Stable. Main testing tool.
- **REST API**: ✅ Stable. `POST /verify-resume-file`.
- **Web UI**: 📅 Planned. React + Vite.

## 🛡️ Resilience
- **Fallback System**: ✅ Implemented. Remote -> Local.
- **Rate Limiting**: 📅 Needed. GitHub API hits limits easily.
- **Caching**: 📅 Needed. Redis/File check for repeat analyses.
