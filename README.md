# 🦅 FAB - The Brutal Resume Verifier

**"Your Resume. The Harsh Reality."**

[![Watch the Demo](https://img.youtube.com/vi/aZr25Oo_l4o/0.jpg)](https://youtu.be/aZr25Oo_l4o)

**[Watch the Full Video Walkthrough](https://youtu.be/aZr25Oo_l4o)**

---

## 🧐 What is this?

**FAB** is an AI-powered agent that acts like a strict technical interviewer. It reads your resume, scans your GitHub repositories, and exposes the truth about your skills.

*   ✅ **Verifies Claims**: Checks if you actually have code to back up "Expert React" on your resume.
*   🔎 **Detects Gaps**: Finds skills you list but haven't used in public projects.
*   🧠 ** AI Interrogator**: Generates specific, project-based interview questions to test your knowledge.
*   📈 **Project Roadmap**: Gives you a concrete plan to build projects and fill your skill gaps.

---

## 🚀 Beginner's Quick Start Guide

You don't need to be an expert to run this. Follow these simple steps.

### Prerequisites
*   **Node.js** (Version 18 or higher) - [Download Here](https://nodejs.org/)
*   **Git** - [Download Here](https://git-scm.com/)
*   (Optional) **Ollama** - If you want to run the AI locally on your PC.

### 1. Clone the Project
Open your terminal (Command Prompt or PowerShell) and run:
```bash
git clone https://github.com/YOUR_USERNAME/FAB.git
cd FAB
```

### 2. Install Dependencies
This command installs all the necessary code libraries for both the frontend (website) and backend (server).
```bash
npm run install:all
```
*(This looks for a `scripts` folder or runs `npm install` in both folders. If that command doesn't exist, run `npm install` inside `backend/` and `frontend/` separately).*

### 3. Setup Configuration
1.  Duplicate the `.env.example` file and rename it to `.env`.
2.  Open `.env` in a text editor (Notepad, VS Code).
3.  Fill in your **GitHub Client ID** and **Secret**. (See [Setup Guide](SETUP_GUIDE.md) for how to get these for free).

### 4. Run the App!
Start the system with one simple command:
```bash
npm run dev
```
This will start:
*   Frontend at: `http://localhost:5173`
*   Backend at: `http://localhost:3000`

Click the link in your terminal to open the app in your browser!

---

## 🧠 AI Brain Setup (Local vs. Cloud)

FAB needs an AI to think. You have two options:

### Option A: Local Brain (Free & Private)
1.  Download [Ollama](https://ollama.com/).
2.  Run `ollama run gemma2:2b` in a separate terminal.
3.  In FAB Settings, select **"Local Core"**.

### Option B: Cloud Brain (Faster & Smarter)
1.  We provide a free Google Colab script to run a powerful AI on Google's GPUs.
2.  Open the [Setup Guide](SETUP_GUIDE.md) to learn how to deploy it in 2 minutes.
3.  In FAB Settings, select **"Remote Uplink"** and paste your URL.

---

## 📸 Screenshots

| Dashboard | Analysis |
|-----------|----------|
| ![Dashboard]([https://via.placeholder.com/400x200?text=Dashboard+UI](https://ibb.co/5hzLH1HG)) | ![Analysis]([https://via.placeholder.com/400x200?text=Skill+Breakdown](https://ibb.co/vvsTb2RW)) |

---

## 🛠️ Built With
*   **Frontend**: React, TailwindCSS, Framer Motion (for those smooth animations)
*   **Backend**: Node.js, Express, TypeScript
*   **AI**: Ollama, Transformers (HuggingFace), LangChain ideas
*   **Database**: SQLite (Simple, file-based)

---

## 🤝 Contributing
Found a bug? Want to add a feature?
1.  Fork the repo.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📬 Open for Opportunities!

**I am currently looking for immediate job opportunities.**
If you have an open role or know someone who is hiring, please contact me:

📧 **Email**: [saumyavishwam@gmail.com](mailto:saumyavishwam@gmail.com)

---

**License**: MIT. Use this tool to improve yourself, not to fake it! 💪

