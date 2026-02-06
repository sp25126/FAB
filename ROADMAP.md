# FAB Technical Roadmap

## 🧠 Brain Architecture
- **Phase 1 (Done):** Hybrid implementation. `LLMFactory` switches between `OllamaProvider` (Local) and `RemoteProvider` (Colab).
- **Phase 2 (In Progress):** RAG & Vector DB. Semantic search for interview questions using ChromaDB/LanceDB.
- **Phase 3:** Fine-tuning. Fine-tune a small model (e.g., Llama-3-8B) on high-quality vs. low-quality resumes.

## ⚡ Core Features
| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Resume Parsing | ✅ Done | High | Supported: PDF, TXT. **New:** Regex Fallback |
| Deep GitHub Analysis | 🚧 In Progress | High | Token-based deep code analysis (src/lib) |
| Web Scraping | 🚧 In Progress | High | Scrape GeeksForGeeks & Terminal.io |
| RAG Questioner | 🚧 In Progress | High | Vector DB + Semantic Search |
| Interview Mode | 🚧 In Progress | High | Max 25 Qs, Satisfaction Score, Brutal Verdict |
| Auto-Scaffolding | 📅 Planned | Medium | script to generating `git init` projects |

## 🖥️ Interfaces
- **CLI (`run.py`)**: 🚧 Revamping. Simple flow for deep analysis & interview.
- **REST API**: ✅ Stable. `POST /verify-resume-file`.
- **Web UI**: 📅 Planned. React + Vite.

## 🛡️ Resilience
- **Fallback System**: ✅ Implemented. Remote -> Local -> Regex.
- **Rate Limiting**: 📅 Needed. GitHub API hits limits easily.
- **Caching**: 📅 Needed. Redis/File check for repeat analyses.
