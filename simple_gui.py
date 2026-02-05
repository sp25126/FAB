import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import requests
import os
import json
import threading
import subprocess
import time
import sys
import logging
from datetime import datetime

# Logging Setup
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "gui.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("FAB_GUI")

# Configuration
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

API_URL = "http://localhost:3000"
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

class ModernFabGUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("FAB - Brutal Truth Agent")
        self.geometry("850x900")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.backend_process = None
        self.backend_ready = False
        self.config_saved = False

        # Header
        self.header_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="#0d0d0d")
        self.header_frame.grid(row=0, column=0, sticky="ew", padx=0, pady=0)
        
        self.header_label = ctk.CTkLabel(
            self.header_frame, 
            text="FAB AGENT // BRUTAL TRUTH", 
            font=("Roboto Medium", 26),
            text_color="#4da6ff"
        )
        self.header_label.pack(pady=20)

        self.status_label = ctk.CTkLabel(self.header_frame, text="⏳ Starting Backend Server...", font=("Roboto", 12), text_color="#ffcc00")
        self.status_label.pack(pady=(0, 15))

        # Main Content
        self.main_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.main_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        self.grid_rowconfigure(1, weight=1)

        # --- Step 1: Brain Configuration (REQUIRED) ---
        self.config_frame = ctk.CTkFrame(self.main_frame, border_width=2, border_color="#4da6ff")
        self.config_frame.pack(fill="x", pady=(0, 20))

        ctk.CTkLabel(self.config_frame, text="STEP 1: CHOOSE YOUR BRAIN", font=("Roboto", 16, "bold"), text_color="#4da6ff").pack(pady=15, padx=15, anchor="w")

        self.brain_var = tk.StringVar(value="local")
        
        self.grid_frame = ctk.CTkFrame(self.config_frame, fg_color="transparent")
        self.grid_frame.pack(fill="x", padx=15, pady=5)
        
        self.rb_local = ctk.CTkRadioButton(self.grid_frame, text="🖥️ Local (Ollama)", variable=self.brain_var, value="local", command=self.update_ui, font=("Roboto", 14))
        self.rb_local.pack(side="left", padx=15)
        
        self.rb_remote = ctk.CTkRadioButton(self.grid_frame, text="☁️ Remote (Colab GPU)", variable=self.brain_var, value="remote", command=self.update_ui, font=("Roboto", 14))
        self.rb_remote.pack(side="left", padx=15)
        
        self.rb_cloud = ctk.CTkRadioButton(self.grid_frame, text="🌐 Cloud API (OpenAI/Gemini)", variable=self.brain_var, value="cloud", command=self.update_ui, font=("Roboto", 14))
        self.rb_cloud.pack(side="left", padx=15)

        # Dynamic Info Panel
        self.info_frame = ctk.CTkFrame(self.config_frame, fg_color="#1a1a1a")
        self.info_frame.pack(fill="x", padx=15, pady=10)
        
        self.url_label = ctk.CTkLabel(self.info_frame, text="Connection Details:", width=120, anchor="w", font=("Roboto", 12))
        self.url_label.pack(side="left", padx=10, pady=10)
        
        self.url_entry = ctk.CTkEntry(self.info_frame, placeholder_text="Enter URL or API Key", width=400, font=("Roboto", 12))
        self.url_entry.pack(side="left", fill="x", expand=True, padx=10, pady=10)

        self.save_btn = ctk.CTkButton(self.config_frame, text="💾 SAVE & APPLY CONFIG", command=self.save_config, width=250, height=45, font=("Roboto", 14, "bold"), fg_color="#00aa44", hover_color="#008833")
        self.save_btn.pack(pady=20)
        
        self.config_status = ctk.CTkLabel(self.config_frame, text="🔴 Not Configured", font=("Roboto", 12), text_color="#ff5555")
        self.config_status.pack(pady=(0, 15))

        # --- Step 2: Analysis Section (LOCKED UNTIL CONFIG) ---
        self.analyze_frame = ctk.CTkFrame(self.main_frame, border_width=1, border_color="#333333")
        self.analyze_frame.pack(fill="x", pady=0)

        ctk.CTkLabel(self.analyze_frame, text="STEP 2: ANALYZE RESUME", font=("Roboto", 16, "bold"), text_color="#888888").pack(pady=10, padx=15, anchor="w")

        self.file_path_var = tk.StringVar()
        
        self.file_frame = ctk.CTkFrame(self.analyze_frame, fg_color="transparent")
        self.file_frame.pack(fill="x", padx=15, pady=10)
        
        self.file_entry = ctk.CTkEntry(self.file_frame, textvariable=self.file_path_var, placeholder_text="Select Resume PDF...", state="disabled")
        self.file_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        
        self.browse_btn = ctk.CTkButton(self.file_frame, text="Browse", width=100, command=self.browse_file, fg_color="#333333", hover_color="#444444", state="disabled")
        self.browse_btn.pack(side="right")

        self.action_btn = ctk.CTkButton(self.analyze_frame, text="🔒 CONFIG REQUIRED TO ANALYZE", font=("Roboto", 16, "bold"), height=55, fg_color="#333333", state="disabled", command=self.analyze_resume)
        self.action_btn.pack(fill="x", padx=20, pady=20)

        self.progress_bar = ctk.CTkProgressBar(self.analyze_frame, height=10)
        self.progress_bar.set(0)

        # --- Output Section ---
        self.output_label = ctk.CTkLabel(self, text="📊 ANALYSIS REPORT", font=("Roboto", 14, "bold"), anchor="w")
        self.output_label.grid(row=2, column=0, sticky="w", padx=20, pady=(10, 5))

        self.output_text = ctk.CTkTextbox(self, font=("Consolas", 12), text_color="#00ff00", fg_color="#0a0a0a")
        self.output_text.grid(row=3, column=0, sticky="nsew", padx=20, pady=(0, 20))
        self.grid_rowconfigure(3, weight=3)
        self.output_text.insert("0.0", ">> Waiting for backend...\n")

        # Initial State
        self.update_ui()
        
        # Start Backend in background
        threading.Thread(target=self.start_backend, daemon=True).start()

    def start_backend(self):
        """Starts the Node.js backend server as a subprocess."""
        try:
            logger.info("Starting Backend Server...")
            self.log(">> Starting Backend Server...")
            
            # Check if backend dir exists
            if not os.path.isdir(BACKEND_DIR):
                self.after(0, lambda: self.status_label.configure(text="❌ Backend directory not found!", text_color="#ff5555"))
                self.log(f"[ERROR] Backend directory not found: {BACKEND_DIR}")
                return

            # Start npm run dev
            npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
            self.backend_process = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=BACKEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )

            self.log(">> Backend process started. Waiting for API...")
            
            # Poll for health
            for _ in range(30):  # Try for 30 seconds
                time.sleep(1)
                try:
                    res = requests.get(f"{API_URL}/health", timeout=2)
                    if res.status_code == 200:
                        self.backend_ready = True
                        self.after(0, lambda: self.status_label.configure(text="✅ Backend Online", text_color="#00ff00"))
                        self.log(">> Backend is READY!")
                        self.after(0, self.load_config)
                        return
                except:
                    pass
            
            self.after(0, lambda: self.status_label.configure(text="⚠️ Backend started but not responding", text_color="#ffaa00"))
            self.log("[WARN] Backend started but /health not responding")

        except Exception as e:
            self.after(0, lambda: self.status_label.configure(text=f"❌ Error: {e}", text_color="#ff5555"))
            self.log(f"[ERROR] Failed to start backend: {e}")

    def update_ui(self):
        btype = self.brain_var.get()
        if btype == 'remote':
            self.url_label.configure(text="Colab URL:")
            self.url_entry.configure(state="normal", placeholder_text="https://xxxx.ngrok-free.app")
        elif btype == 'cloud':
            self.url_label.configure(text="API Key:")
            self.url_entry.configure(state="normal", placeholder_text="sk-...")
        else:
            self.url_label.configure(text="Local Mode:")
            self.url_entry.configure(state="disabled", placeholder_text="Using Ollama @ localhost:11434")

    def load_config(self):
        try:
            res = requests.get(f"{API_URL}/config/brain", timeout=2)
            if res.status_code == 200:
                data = res.json()
                self.brain_var.set(data.get('brainType', 'local'))
                if data.get('remoteUrl'):
                    self.url_entry.delete(0, "end")
                    self.url_entry.insert(0, data.get('remoteUrl'))
                self.after(0, self.update_ui)
        except:
            pass

    def save_config(self):
        url = self.url_entry.get()
        btype = self.brain_var.get()
        data = {"brainType": btype, "remoteUrl": url if btype != 'local' else ''}
        
        def _save():
            try:
                requests.post(f"{API_URL}/config/brain", json=data, timeout=5)
                self.config_saved = True
                self.after(0, self.unlock_analysis)
                self.after(0, lambda: messagebox.showinfo("Success", f"Brain set to: {btype.upper()}"))
            except Exception as e:
                self.after(0, lambda: messagebox.showerror("Error", f"Failed to save: {e}"))

        threading.Thread(target=_save, daemon=True).start()

    def unlock_analysis(self):
        """Enables the Analysis section after config is saved."""
        self.config_status.configure(text="🟢 Configured", text_color="#00ff00")
        self.analyze_frame.configure(border_color="#00aa44")
        self.file_entry.configure(state="normal")
        self.browse_btn.configure(state="normal", fg_color="#2a2a2a")
        self.action_btn.configure(state="normal", text="🔍 ANALYZE RESUME", fg_color="#00cc44", hover_color="#009933")
        self.log(">> Configuration Saved! You can now analyze resumes.")

    def browse_file(self):
        path = filedialog.askopenfilename(filetypes=[("PDF Files", "*.pdf")])
        if path:
            self.file_path_var.set(path)

    def analyze_resume(self):
        path = self.file_path_var.get()
        if not path or not os.path.exists(path):
            messagebox.showwarning("Input Required", "Please select a valid PDF file.")
            return

        self.action_btn.configure(state="disabled", text="⏳ ANALYZING...")
        self.progress_bar.pack(fill="x", padx=20, pady=(0, 20))
        self.progress_bar.start()
        self.output_text.delete("0.0", "end")
        self.log(">> Starting Analysis...")
        self.log(f">> File: {os.path.basename(path)}")
        self.log(f">> Brain: {self.brain_var.get().upper()}")

        threading.Thread(target=self._run_process, args=(path,), daemon=True).start()

    def _run_process(self, path):
        try:
            with open(path, 'rb') as f:
                files = {'resume': f}
                data = {'username': 'fab_gui_user'}
                res = requests.post(f"{API_URL}/verify-resume-file", files=files, data=data, timeout=120)

            if res.status_code == 200:
                result = res.json()
                self.after(0, lambda: self.show_success(result))
            else:
                self.after(0, lambda: self.show_error(f"Server Error ({res.status_code}): {res.text}"))

        except Exception as e:
            self.after(0, lambda: self.show_error(f"Connection Failed: {e}"))

    def show_success(self, data):
        self.progress_bar.stop()
        self.progress_bar.pack_forget()
        self.action_btn.configure(state="normal", text="🔍 ANALYZE RESUME")
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║                      BRUTAL TRUTH VERDICT                     ║
╚══════════════════════════════════════════════════════════════╝

  {data.get('brutalTruth', 'No verdict returned.')}

──────────────────────────────────────────────────────────────────
  📊 METRICS
──────────────────────────────────────────────────────────────────
  Claims Found : {data.get('claimsFound', 0)}
  Risk Level   : {data.get('summary', {}).get('risk', 'N/A')}
  Honesty Score: {data.get('summary', {}).get('honestyScore', 0)}/100
  Verified     : {data.get('summary', {}).get('verified', 0)}/{data.get('summary', {}).get('totalClaims', 0)}

──────────────────────────────────────────────────────────────────
  📄 RAW DATA
──────────────────────────────────────────────────────────────────
{json.dumps(data, indent=2)}
"""
        self.output_text.delete("0.0", "end")
        self.output_text.insert("0.0", report)

    def show_error(self, msg):
        self.progress_bar.stop()
        self.progress_bar.pack_forget()
        self.action_btn.configure(state="normal", text="🔍 ANALYZE RESUME")
        self.log(f"\n[ERROR] {msg}\n")
    
    def log(self, msg):
        self.output_text.insert("end", f"{msg}\n")
        self.output_text.see("end")

    def on_closing(self):
        """Cleanup backend process on exit."""
        if self.backend_process:
            self.backend_process.terminate()
        self.destroy()

if __name__ == "__main__":
    app = ModernFabGUI()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
