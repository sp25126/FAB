#!/usr/bin/env python3
"""
FAB - Brutal Truth Resume Agent (CLI Version)
Run this script to analyze your resume using Local LLM or Cloud GPU.
"""

import os
import sys
import subprocess
import time
import requests
import json

# Configuration
API_URL = "http://localhost:3000"
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
ENV_PATH = os.path.join(BACKEND_DIR, ".env")

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print("=" * 60)
    print("   FAB - BRUTAL TRUTH RESUME AGENT")
    print("   Your resume. The harsh reality.")
    print("=" * 60)
    print()

def update_env(brain_type: str, remote_url: str = ""):
    """Updates the .env file with brain configuration."""
    env_content = f"""PORT=3000
GITHUB_TOKEN=
BRAIN_TYPE={brain_type}
REMOTE_BRAIN_URL={remote_url}
"""
    with open(ENV_PATH, 'w') as f:
        f.write(env_content)
    print(f"✅ Configuration saved: BRAIN_TYPE={brain_type}")

def start_backend():
    """Starts the Node.js backend server."""
    print("\n⏳ Cleaning up old processes on port 3000...")
    
    # Kill any existing process on port 3000 (quick timeout)
    try:
        if sys.platform == "win32":
            subprocess.run("npx -y kill-port 3000", shell=True, timeout=10, 
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.run("npx -y kill-port 3000", shell=True, timeout=10,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass  # Ignore timeout or errors
    
    time.sleep(1)
    print("⏳ Starting backend server...")
    
    # Start backend with shell=True for Windows compatibility
    try:
        if sys.platform == "win32":
            process = subprocess.Popen(
                "npm run dev",
                cwd=BACKEND_DIR,
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=BACKEND_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return None
    
    # Wait for health check
    for i in range(20):
        time.sleep(1)
        try:
            res = requests.get(f"{API_URL}/health", timeout=2)
            if res.status_code == 200:
                print("✅ Backend is ONLINE!")
                return process
        except:
            pass
        print(f"   Waiting... ({i+1}/20)")
    
    print("❌ Backend failed to start. Try running manually:")
    print("   cd backend && npm run dev")
    return None

def analyze_resume(file_path: str):
    """Sends resume to backend for analysis."""
    print(f"\n📄 Analyzing: {os.path.basename(file_path)}")
    print("-" * 70)
    
    try:
        with open(file_path, 'rb') as f:
            files = {'resume': f}
            data = {'username': 'cli_user'}
            res = requests.post(f"{API_URL}/verify-resume-file", files=files, data=data, timeout=120)
        
        if res.status_code == 200:
            result = res.json()
            
            # Header
            print("\n" + "=" * 70)
            print("                      BRUTAL TRUTH VERDICT")
            print("=" * 70)
            print(f"\n   {result.get('brutalTruth', 'No verdict.')}\n")
            
            # Summary Stats
            summary = result.get('summary', {})
            print("-" * 70)
            print("   SUMMARY")
            print("-" * 70)
            print(f"   Total Claims    : {summary.get('totalClaims', 0)}")
            print(f"   Verified        : {summary.get('verified', 0)}")
            print(f"   Weak Support    : {summary.get('weakSupport', 0)}")
            print(f"   Overclaimed     : {summary.get('overclaimed', 0)}")
            print(f"   Honesty Score   : {summary.get('honestyScore', 0)}/100")
            print(f"   Risk Level      : {summary.get('risk', 'N/A')}")
            
            # Per-Skill Breakdown
            verification = result.get('verification', [])
            if verification:
                print("\n" + "-" * 70)
                print("   SKILL-BY-SKILL VERIFICATION")
                print("-" * 70)
                print(f"   {'SKILL':<20} {'VERDICT':<15} {'EVIDENCE'}")
                print("   " + "-" * 64)
                
                for item in verification:
                    skill = item.get('skill', 'unknown')[:18]
                    verdict = item.get('verdict', 'N/A')
                    evidence = item.get('githubEvidence', 'No data')[:35]
                    
                    # Color coding (using symbols)
                    if verdict == 'VERIFIED':
                        symbol = "✅"
                    elif verdict == 'WEAK':
                        symbol = "⚠️"
                    else:
                        symbol = "❌"
                    
                    print(f"   {symbol} {skill:<18} {verdict:<13} {evidence}")
                
                # Recommendations
                print("\n" + "-" * 70)
                print("   RECOMMENDATIONS")
                print("-" * 70)
                for item in verification:
                    if item.get('verdict') == 'OVERCLAIMED':
                        print(f"   ❌ {item.get('skill')}: {item.get('recommendation', 'Review this skill')}")
            
            print("\n" + "=" * 70)
            
            # Save full result
            output_file = "last_analysis.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n📁 Full JSON saved to: {output_file}")
            
        else:
            print(f"❌ Server Error ({res.status_code}): {res.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main_menu():
    """Main CLI menu."""
    print_header()
    
    print("Choose your AI Brain:\n")
    print("  [1] 🖥️  LOCAL  - Use Ollama (requires gemma:2b installed)")
    print("  [2] ☁️  CLOUD  - Use Remote GPU (Google Colab)")
    print("  [0] ❌  EXIT")
    print()
    
    choice = input("Enter choice (1/2/0): ").strip()
    
    if choice == "1":
        print("\n🖥️ Local Mode Selected")
        print("   Make sure Ollama is running: ollama run gemma:2b")
        update_env("local")
        
    elif choice == "2":
        print("\n☁️ Cloud Mode Selected")
        print("-" * 50)
        print("To set up your Cloud GPU Brain:")
        print("1. Open Google Colab: https://colab.research.google.com")
        print("2. Run the script from: SETUP.md (or tools/colab-brain/fab_brain.py)")
        print("3. Copy the ngrok URL that appears")
        print("-" * 50)
        
        remote_url = input("\nEnter your Cloud Brain URL (or press Enter to see SETUP.md): ").strip()
        
        if not remote_url:
            print("\n📖 See SETUP.md for detailed instructions.")
            print("   After setting up Colab, run this script again and enter the URL.")
            input("\nPress Enter to exit...")
            return False
        
        update_env("remote", remote_url)
        
    elif choice == "0":
        print("\nGoodbye!")
        return False
    else:
        print("\n❌ Invalid choice. Try again.")
        input("Press Enter...")
        return main_menu()
    
    return True

def resume_menu(backend_process):
    """Resume analysis loop."""
    while True:
        print("\n" + "=" * 60)
        print("RESUME ANALYSIS")
        print("=" * 60)
        
        file_path = input("\nEnter path to resume PDF (or 'q' to quit): ").strip()
        
        if file_path.lower() == 'q':
            break
        
        # Remove quotes if present
        file_path = file_path.strip('"').strip("'")
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue
        
        if not file_path.lower().endswith('.pdf'):
            print("❌ Only PDF files are supported.")
            continue
        
        analyze_resume(file_path)
        
        input("\nPress Enter to analyze another resume...")
    
    # Cleanup
    if backend_process:
        print("\n⏳ Shutting down backend...")
        backend_process.terminate()
    
    print("\n👋 Goodbye!")

if __name__ == "__main__":
    if main_menu():
        backend = start_backend()
        if backend:
            resume_menu(backend)
