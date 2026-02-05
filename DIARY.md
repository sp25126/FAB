# 📔 Developer Diary - FAB Project (Phase 1)
**Date:** February 5, 2026  
**Developer:** Antigravity (AI Agent)  
**Session:** 1:30 PM - 6:45 PM  

---

## 🕒 1:30 PM - The "GUI" Beginning (and Failures)
**Goal:** Build a sleek Python GUI (CustomTkinter) for the resume analyzer.  
- **Action:** Created `simple_gui.py` to launch backend and select brain type.
- **FAILURE 🛑:** The GUI backend connection was unstable. Windows subprocess management caused "Check if backend dir exists" errors and port conflicts (3000 used).
- **Pivot:** Decided to ditch the complex GUI for a robust CLI. "Keep it simple, stupid" (KISS) principle.

## 🕒 2:15 PM - The Pivot to CLI
**Goal:** Create a terminal-based interface that just works.
- **Action:** Created `run.py`.
- **Change:** Implemented a simple menu: `[1] Local`, `[2] Cloud`.
- **Win:** Backend started reliably using `subprocess.Popen` with `shell=True`.

## 🕒 3:00 PM - The "GitHub 404" Bug (Critical)
**Issue:** Testing with the GUI user (`fab_gui_user`) caused a backend crash.
- **Error:** `GitHub API failed: 404` (User not found).
- **Fix:** Modified `server.ts` to make GitHub verification **optional**. If the username is invalid or missing, we log a warning but proceed with purely resume-based analysis.
- **Lesson:** Never let an external API dependencies (GitHub) crash the core service (Resume Analysis).

## 🕒 3:45 PM - The "Fake Colab" Discovery
**Issue:** I tested the Colab brain, but the results were suspiciously identical to the Local brain.
- **Discovery:** `LLMFactory` had a placeholder: `case 'remote': return new OllamaProvider()`. The "Remote" option was secretly just using Local! 😱
- **Action:** Created `backend/src/modules/llm/remote.ts`. Implemented `RemoteProvider` to actually call the ngrok URL.
- **Result:** Colab brain connected! Latency dropped from 50s to ~6s.

## 🕒 4:30 PM - The "Zero Skills" Panic
**Issue:** Enhanced parser was returning 0 claims from Colab.
- **Error:** JSON parsing worked, but the arrays were empty (`[]`).
- **Debugging:** Checked `llm_debug_response.txt`. The LLM was being too "creative" or the prompt was too complex for the first pass.
- **Fix:** Simplified the prompt instructions and added retry logic.

## 🕒 5:15 PM - The "Enhanced Output" Breakthrough
**Goal:** Make the feedback actually useful, not just "Verified/Overclaimed".
- **Action:** Rewrote `ResumeParser` to extract Experience, Projects, Education.
- **Action:** Rewrote `ClaimVerifier` with a database of **20+ Project Ideas**.
- **Win:** Instead of just saying "React: Overclaimed", it now says:
  > *"Build a Task Manager with Redux. Here is your learning path..."*

## 🕒 6:00 PM - The Unbreakable Fallback System
**Goal:** What if Colab (ngrok) dies mid-demo?
- **Action:** Implemented automatic fallback in `parser.ts`.
- **Logic:** `if (colab_error OR skill_count == 0) -> Switch to Local Ollama`.
- **Verification:** Tested with a fake URL (`https://bad-url...`). System seamlessly switched to Local and returned result. **Success.**

## 🕒 6:30 PM - Final Polish & Documentation
**Action:**
- Updated `README.md` with "Brutal Truth" branding.
- Created `SETUP.md` for the Colab script.
- Cleaned up 10+ temp JSON files.
- Git initialized and committed.

---

## 🔑 Key Takeaways
1.  **Fail Fast:** The GUI was a distraction. Killing it early saved the project.
2.  **Trust but Verify:** I assumed `remote` was working, but logs proved it was hitting local. Always check the logs!
3.  **Resilience is King:** The Fallback system makes this production-ready. A crash is the worst user experience.

## 📉 Least Important Thing I Did
- Tried to fix the emoji alignment in the CLI menu multiple times. (Aesthetic, but consumed 15 mins).

## 📈 Most Important Thing I Did
- **The Fallback System.** It turns a "Server Error" into a slightly slower "Success". This is the difference between a toy and a tool.
