# 🛠️ FAB Setup Guide

This guide will help you set up **FAB (The Resume Verifier)** on your computer from scratch. It's designed for complete beginners!

---

## 1. Prerequisites (What you need installed)

Before starting, ensure you have these two tools installed:

1.  **Node.js (Version 18+)**: This runs the code.
    *   👉 [Download Node.js](https://nodejs.org/) (Choose the "LTS" version).
    *   To check if installed, open terminal and type: `node -v`

2.  **Git**: This downloads the code.
    *   👉 [Download Git](https://git-scm.com/)
    *   To check if installed, type: `git --version`

---

## 2. Get the Code

1.  Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Mac).
2.  Run this command to download the project:
    ```bash
    git clone https://github.com/YOUR_USERNAME/FAB.git
    ```
3.  Go into the project folder:
    ```bash
    cd FAB
    ```

---

## 3. Install Dependencies

We need to download the "libraries" that make the code work.

1.  Run the installation script:
    ```bash
    npm run install:all
    ```
    *(If this fails, don't worry! You can do it manually:
    `cd backend && npm install` then `cd ../frontend && npm install`)*

---

## 4. Configuration (The Important Part!)

We need to tell the app your secrets (like API keys) so it can access GitHub.

1.  **Create the Environment File**:
    *   Find the file named `.env.example` in the project folder.
    *   Copy and paste it, and rename the copy to `.env`.

2.  **Get GitHub Keys (It's Free)**:
    *   Go to [GitHub Developer Settings](https://github.com/settings/applications/new).
    *   **Application Name**: FAB (or anything).
    *   **Homepage URL**: `http://localhost:5173`
    *   **Authorization callback URL**: `http://localhost:5173`
    *   Click **Register application**.
    *   You will see a **Client ID**. Copy it.
    *   Click **Generate a new client secret**. Copy it.

3.  **Update `.env`**:
    *   Open your new `.env` file in Notepad or VS Code.
    *   Paste your Client ID next to `GITHUB_CLIENT_ID=`.
    *   Paste your Secret next to `GITHUB_CLIENT_SECRET=`.
    *   Save the file.

---

## 5. Run the Application

You are ready to launch!

1.  In your terminal (inside the FAB folder), run:
    ```bash
    npm run dev
    ```
2.  You will see output like:
    ```
    ➜  Local:   http://localhost:5173/
    ➜  Backend: http://localhost:3000
    ```
3.  **Click the Local link** (or type `http://localhost:5173` in your browser).
4.  The FAB dashboard should open! 🎉

---

## 6. (Optional) Advanced AI Setup

By default, FAB can use **Local AI (Ollama)** or **Cloud AI**.

### Using Local AI (Free, Private, Slower)
1.  Download [Ollama](https://ollama.com).
2.  Run in a separate terminal: `ollama run gemma2:2b`
3.  In FAB Settings, choose "Local Core".

### Using Cloud AI (Fast, Powerful)
1.  Open our [Google Colab Notebook](https://colab.research.google.com/drive/YOUR_COLAB_LINK).
2.  Click "Runtime" -> "Change runtime type" -> Select **T4 GPU**.
3.  Press the Play button on the script.
4.  Copy the `ngrok` URL it gives you (e.g., `https://xyz.ngrok-free.app`).
5.  In FAB Settings, choose "Remote Uplink" and paste the URL.

---

## Troubleshooting

*   **"npm command not found"**: You didn't install Node.js correctly. Reinstall it.
*   **"GitHub rate limit exceeded"**: You didn't set up your `.env` keys correctly. Double check Step 4.
*   **"Connection refused"**: Make sure you ran `npm run dev` and kept the terminal window open.
