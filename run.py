import os
import sys
import requests
import time
import json
from datetime import datetime
import webbrowser
import subprocess
from hardware_detector import HardwareDetector

# Configuration
API_URL = "http://localhost:3000"
RESUMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resumes")
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")

# Ensure logs dir
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    CYAN = '\033[96m'

class Logger:
    """Comprehensive logging for both local and cloud brain operations."""
    
    def __init__(self, context_name):
        self.session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.context_name = context_name
        
        # Multiple log files for different purposes
        self.interview_file = os.path.join(LOGS_DIR, f"session_{self.session_id}_interview.txt")
        self.system_file = os.path.join(LOGS_DIR, f"session_{self.session_id}_system.txt")
        self.brain_file = os.path.join(LOGS_DIR, f"session_{self.session_id}_brain.txt")
        
        self.brain_type = None
        self.api_calls = 0
        self.fallback_count = 0
        
        self._log_system(f"=== SESSION STARTED: {datetime.now()} ===")
        self._log_system(f"Context: {context_name}")
        
    def _write(self, filepath, message):
        with open(filepath, 'a', encoding='utf-8') as f:
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            f.write(f"[{timestamp}] {message}\n")
    
    def log(self, message):
        """Legacy log method - writes to interview file."""
        self._write(self.interview_file, message)
        
    def _log_system(self, message):
        self._write(self.system_file, message)
        
    def _log_brain(self, message):
        self._write(self.brain_file, message)
    
    def log_hardware(self, hw_details: dict):
        """Log hardware detection results."""
        self._log_system(f"HARDWARE: {json.dumps(hw_details)}")
        print(f"{Colors.CYAN}📋 Hardware logged to {self.system_file}{Colors.ENDC}")
        
    def log_brain_selection(self, brain_type: str, recommendation: str, url: str = None):
        """Log brain selection with recommendation."""
        self.brain_type = brain_type
        self._log_system(f"BRAIN_SELECTION: type={brain_type}, recommended={recommendation}, url={url or 'N/A'}")
        self._log_brain(f"Brain Type: {brain_type.upper()}")
        if url:
            self._log_brain(f"Remote URL: {url}")
    
    def log_api_request(self, endpoint: str, method: str, payload_size: int):
        """Log outgoing API request."""
        self.api_calls += 1
        self._log_system(f"API_REQUEST: #{self.api_calls} {method} {endpoint} (payload: {payload_size} bytes)")
        
    def log_api_response(self, endpoint: str, status: int, time_ms: int, response_size: int):
        """Log API response."""
        self._log_system(f"API_RESPONSE: {endpoint} status={status} time={time_ms}ms size={response_size} bytes")
        self._log_brain(f"API {endpoint}: {status} in {time_ms}ms")
    
    def log_fallback(self, from_brain: str, to_brain: str, reason: str):
        """Log brain fallback event."""
        self.fallback_count += 1
        self._log_system(f"FALLBACK #{self.fallback_count}: {from_brain} -> {to_brain} | Reason: {reason}")
        self._log_brain(f"FALLBACK: {from_brain} -> {to_brain}")
        print(f"{Colors.WARNING}⚠️ Fallback: {from_brain} -> {to_brain} ({reason}){Colors.ENDC}")

    def log_qa(self, question, answer, feedback, score):
        self.log(f"\nQ: {question}")
        self.log(f"A: {answer}")
        self.log(f"Feedback: {feedback} (Score: {score})")
        
    def get_summary(self) -> dict:
        """Return session summary for final report."""
        return {
            "session_id": self.session_id,
            "brain_type": self.brain_type,
            "api_calls": self.api_calls,
            "fallback_count": self.fallback_count,
            "log_files": {
                "interview": self.interview_file,
                "system": self.system_file,
                "brain": self.brain_file
            }
        }

def print_header():
    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"🔥 FAB - BRUTAL TRUTH INTERVIEW AGENT 🔥")
    print(f"{'='*60}{Colors.ENDC}")

def detect_and_display_hardware(logger) -> str:
    """Run hardware detection and return recommendation."""
    detector = HardwareDetector()
    details = detector.detect_all()
    
    # Display Summary
    print(detector.get_display_summary())
    
    # Log Hardware Details
    logger.log_hardware(details)
    
    return details.get("recommendation", "CLOUD")

def get_input(prompt, default=""):
    prompt_text = f"{Colors.BOLD}{prompt}{Colors.ENDC}"
    if default:
        prompt_text += f" [{default}]"
    prompt_text += ": "
    
    # Standard input() is usually safer across environments unless specific issues arise
    try:
        val = input(prompt_text).strip()
        return val if val else default
    except (EOFError, KeyboardInterrupt):
        print("\nExiting...")
        sys.exit(0)
    except Exception:
        return default

def check_backend():
    """Check if backend is running."""
    try:
        requests.get(f"{API_URL}/health", timeout=2)
        return True
    except:
        return False

def start_backend():
    """Start the backend server as a subprocess, logging output to file."""
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    log_file = os.path.join(LOGS_DIR, "backend_startup.log")
    
    print(f"{Colors.WARNING}🚀 Starting backend server... (Logs: logs/backend_startup.log){Colors.ENDC}", flush=True)
    
    with open(log_file, "w") as f:
        # Start npm run dev in background
        if sys.platform == "win32":
            process = subprocess.Popen(
                "npm run dev",
                cwd=backend_dir,
                shell=True,
                stdout=f,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=backend_dir,
                stdout=f,
                stderr=subprocess.STDOUT,
                start_new_session=True
            )
    
    # Wait for backend to be ready (max 60 seconds)
    print(f"{Colors.CYAN}⏳ Waiting for backend to start... (This may take up to 60s){Colors.ENDC}", flush=True)
    
    # Check every 1s, but each check takes up to 2s timeout = 3s total per iteration
    # So 20 iterations * 3s = 60s max
    for i in range(20):
        time.sleep(1)
        if check_backend():
            print(f"{Colors.GREEN}✅ Backend started successfully!{Colors.ENDC}", flush=True)
            return True
        
        # Show progress every 5s approx
        if i % 3 == 2:
            elapsed = (i + 1) * 3  # Rough estimate
            print(f"   Still waiting... ({elapsed}s elapsed)", flush=True)
            
    print(f"{Colors.FAIL}❌ Backend failed to start. Check logs/backend_startup.log for errors.{Colors.ENDC}", flush=True)
    return False

def ensure_backend_running():
    """Ensure backend is running, start it if not."""
    print("Checking backend status...", flush=True)
    if check_backend():
        print(f"{Colors.GREEN}✅ Backend already running{Colors.ENDC}", flush=True)
        return True
    else:
        print(f"{Colors.WARNING}Backend not running, starting it...{Colors.ENDC}", flush=True)
        return start_backend()

def configure_brain(logger, hw_recommendation: str = "CLOUD"):
    print(f"\n{Colors.BLUE}🧠 Configure AI Brain{Colors.ENDC}")
    print(f"Option 1: {Colors.BOLD}Local Brain (Ollama){Colors.ENDC} - Runs entirely on your PC. Private & Free.")
    print(f"Option 2: {Colors.BOLD}Cloud Brain (Colab/Kaggle){Colors.ENDC} - Offloads heavy AI tasks. Faster & Smarter.")
    
    print(f"\n{Colors.CYAN}🎯 SYSTEM RECOMMENDATION: {hw_recommendation}{Colors.ENDC}")
    
    default_choice = "1" if hw_recommendation == "LOCAL" else "2"
    choice = input(f"\nSelect Brain Type (1/2) [Default: {default_choice}]: ").strip() or default_choice
    
    if choice == "1":
        brain_type = "local"
        print(f"{Colors.GREEN}✅ Selected: Local Brain.{Colors.ENDC}")
        logger.log_brain_selection("local", hw_recommendation)
        return "local"
    else:
        brain_type = "remote"
        print(f"{Colors.GREEN}✅ Selected: Cloud Brain.{Colors.ENDC}")
        logger.log_brain_selection("remote", hw_recommendation)
        return "remote"
        
def select_resume(logger):
    print(f"\n{Colors.BLUE}Phase 2: Resume Selection{Colors.ENDC}")
    logger.log("Phase 2: Resume Selection")
    
    if not os.path.exists(RESUMES_DIR):
        os.makedirs(RESUMES_DIR)
        
    pdfs = [f for f in os.listdir(RESUMES_DIR) if f.lower().endswith('.pdf')]
    
    if not pdfs:
        print(f"{Colors.WARNING}No resumes found in {RESUMES_DIR}{Colors.ENDC}")
        print("Please add a PDF resume to this folder and try again.")
        sys.exit(1)
        
    print(f"Found {len(pdfs)} resumes:")
    for i, pdf in enumerate(pdfs):
        print(f"[{i+1}] {pdf}")
        
    idx = int(get_input("Select Resume #", "1")) - 1
    if idx < 0 or idx >= len(pdfs):
        print(f"{Colors.FAIL}Invalid selection.{Colors.ENDC}")
        sys.exit(1)
    
    selected = pdfs[idx]
    logger.log(f"Selected resume: {selected}")
    return os.path.join(RESUMES_DIR, selected)

def analyze_resume(file_path, username, logger):
    print(f"\n{Colors.BLUE}Phase 3: Analyzing Resume & Skills... (This may take 30s){Colors.ENDC}")
    logger.log(f"Phase 3: Analysis for {username}")
    
    with open(file_path, 'rb') as f:
        files = {'resume': (os.path.basename(file_path), f, 'application/pdf')}
        data = {'username': username}
        
        try:
            res = requests.post(f"{API_URL}/verify-resume-file", files=files, data=data, timeout=60)
            if res.status_code != 200:
                raise Exception(res.text)
            
            result = res.json()
            logger.log(f"Resume Analysis Result: {result.get('claimsFound')} claims found. Score: {result.get('summary', {}).get('honestyScore')}")
            return result
        except Exception as e:
            err = f"Analysis failed: {e}"
            print(f"{Colors.FAIL}❌ {err}{Colors.ENDC}")
            logger.log(f"ERROR: {err}")
            sys.exit(1)

def analyze_github_deep(username, logger):
    print(f"\n{Colors.BLUE}Phase 4: Deep GitHub Analysis{Colors.ENDC}")
    logger.log("Phase 4: GitHub Deep Scan")
    
    token = get_input("Enter GitHub Token (Optional - for deep code analysis)", "")
    if token: logger.log("Token provided")
    
    print(f"{Colors.WARNING}⏳ Scanning repositories... (This may take 1 minute){Colors.ENDC}")
    
    try:
        res = requests.post(f"{API_URL}/analyze-github", json={
            "username": username,
            "token": token
        }, timeout=120)
        if res.status_code != 200:
            try:
                error_data = res.json()
                error_msg = error_data.get('error', 'Unknown error')
                print(f"{Colors.WARNING}⚠️ GitHub analysis failed: {error_msg}{Colors.ENDC}")
                
                if "rate limit" in error_msg.lower():
                    print(f"{Colors.CYAN}💡 Tip: Use a GitHub Token to bypass rate limits.{Colors.ENDC}")
            except:
                print(f"{Colors.WARNING}⚠️ GitHub analysis failed (Status {res.status_code}).{Colors.ENDC}")
                
            logger.log(f"GitHub analysis failed: {res.text}")
            return []
        
        result = res.json()
        projects = result.get('projects', [])
        msg = f"Analyzed {len(projects)} projects deep."
        print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")
        
        for p in projects:
            print(f"   - {Colors.BOLD}{p['name']}{Colors.ENDC} ({p['complexity']}) | {p['architecture']}")
            if p.get('techStack'):
                print(f"     Stack: {', '.join(p['techStack'][:5])}")
        
        logger.log(msg)
        return projects
    except Exception as e:
        print(f"{Colors.WARNING}⚠️ GitHub error: {e}{Colors.ENDC}")
        logger.log(f"GitHub Error: {e}")
        return []

def run_interview(username, resume_data, projects, brain_type, logger, enable_training=False):
    print(f"\n{Colors.BLUE}Phase 5: The Interview{Colors.ENDC}")
    logger.log("Phase 5: Interview Start")
    print(f"{Colors.BOLD}Initializing RAG System & Scraper...{Colors.ENDC}")
    
    # Construct Context
    skills = []
    if 'verification' in resume_data:
        skills = [v['skill'] for v in resume_data['verification']]
    
    if not skills:
        skills = ["General Software Engineering"] 

    context = {
        "skills": skills,
        "projects": projects,
        "experience": [], 
        "githubStats": {},
        "summary": resume_data.get('resumeBio', "Candidate with software engineering background.")
    }
    
    # Start Session with Retries
    session = None
    for attempt in range(3):
        try:
            res = requests.post(f"{API_URL}/interview/start", json={
                "username": username,
                "context": context,
                "brainType": brain_type,
                "enableTraining": enable_training
            }, timeout=60)
            
            if res.status_code == 200:
                session = res.json()
                break
            else:
                raise Exception(res.text)
        except Exception as e:
            if attempt < 2:
                print(f"{Colors.WARNING}⚠️ Connection issue. Retrying transition ({attempt+1}/3)...{Colors.ENDC}")
                time.sleep(2)
            else:
                print(f"{Colors.FAIL}❌ Final Connection Error: {e}{Colors.ENDC}")
                logger.log(f"Interview Start Error: {e}")
                sys.exit(1)
            
    if not session:
        sys.exit(1)
        
    session_id = session['sessionId']
    logger.log(f"Session ID: {session_id}")
    
    print(f"\n{Colors.GREEN}🎤 INTERVIEW STARTED{Colors.ENDC}")
    first_q = session['firstQuestion']
    print(f"AI: {first_q}")
    logger.log(f"AI: {first_q}")
        
    try:
        while True:
            # Ensure prompt is visible on Windows
            print(f"\n{Colors.BLUE}You: {Colors.ENDC}", end='', flush=True)
            answer = input().strip()
            
            # Accept any answer with at least 1 character
            if len(answer) == 0:
                print("Please type something (or 'quit' to exit).")
                continue
            
            # Allow user to quit gracefully
            if answer.lower() in ['quit', 'exit', 'q']:
                print(f"{Colors.WARNING}Ending interview early...{Colors.ENDC}")
                break
                
            print(f"{Colors.WARNING}Thinking...{Colors.ENDC}", flush=True)
            
            # Submit Answer
            res = requests.post(f"{API_URL}/interview/answer", json={
                "sessionId": session_id,
                "answer": answer
            }, timeout=60)
            
            result = res.json()
                
            # Show Feedback
            score = result.get('score', 0)
            satisfaction = result.get('satisfaction', 50)
            feedback = result.get('feedback', '')
            breakdown = result.get('breakdown', {})
            
            logger.log_qa("Question", answer, feedback, score)
            
            color = Colors.GREEN if score > 70 else Colors.WARNING if score > 40 else Colors.FAIL
            print(f"\n{Colors.BOLD}Feedback:{Colors.ENDC} {color}{feedback} (Score: {score}){Colors.ENDC}")
            
            if breakdown:
                acc = breakdown.get('accuracy', 0)
                dep = breakdown.get('depth', 0)
                com = breakdown.get('communication', 0)
                print(f"📊 {Colors.BOLD}Metrics:{Colors.ENDC} Accurate: {acc}% | Depth: {dep}% | Clarity: {com}%")

            print(f"Satisfaction: {satisfaction}/100")
            
            if result.get('redFlags'):
                flags = ', '.join(result['redFlags'])
                print(f"{Colors.FAIL}🚩 Red Flags: {flags}{Colors.ENDC}")
                logger.log(f"RED FLAGS: {flags}")
            
            if result.get('done'):
                logger.log("Interview Completed")
                break
            
            next_q = result.get('nextQuestion')
            next_q_text = "No more questions."
            q_type = "TECHNICAL"
            
            if isinstance(next_q, dict):
                next_q_text = next_q.get('text', 'No question text provided.')
                q_type = next_q.get('type', 'TECHNICAL')
            elif next_q:
                next_q_text = next_q

            print(f"\n{Colors.BOLD}[{q_type}] AI: {next_q_text}{Colors.ENDC}")
            logger.log(f"[{q_type}] AI: {next_q_text}")

                
        # Summary
        print_verdict(session_id, logger)
            
    except Exception as e:
        err = f"Interview error: {e}"
        print(f"{Colors.FAIL}❌ {err}{Colors.ENDC}")
        logger.log(f"CRITICAL ERROR: {err}")

def show_progress(username):
    print(f"\n{Colors.BLUE}📈 Fetching Growth Data for {username}...{Colors.ENDC}")
    
    try:
        # 1. Overview
        res = requests.get(f"{API_URL}/progress/{username}")
        if res.status_code != 200:
            print(f"{Colors.WARNING}No history found for {username}.{Colors.ENDC}")
            return

        data = res.json()
        print(f"\n{Colors.HEADER}🎓 CAREER REPORT CARD: {username.upper()}{Colors.ENDC}")
        print(f"{'='*60}")
        print(f"Total Interviews: {data['totalInterviews']}")
        print(f"Current Level:    {data['currentScore']}/100")
        
        imp = data['improvement']
        color = Colors.GREEN if imp > 0 else Colors.FAIL
        print(f"Total Growth:     {color}{'+' if imp > 0 else ''}{imp} points{Colors.ENDC}")
        
        # 2. Project Impact
        res_proj = requests.get(f"{API_URL}/progress/{username}/projects")
        projects = res_proj.json().get('projects', [])
        
        if projects:
            print(f"\n{Colors.BOLD}🚀 Project Impact (What got you hired):{Colors.ENDC}")
            for p in projects[:3]:
                print(f"   - {p['name']}: {Colors.GREEN}+{p['scoreImpact']} pts{Colors.ENDC} ({p['verdict']})")
        
        # 3. Next Action
        res_action = requests.get(f"{API_URL}/progress/{username}/next-action")
        action = res_action.json()
        
        print(f"\n{Colors.BOLD}🤖 AI Coach Recommendation:{Colors.ENDC}")
        print(f"   Action: {Colors.CYAN}{action['action']}{Colors.ENDC}")
        print(f"   Reason: {action['reason']}")
        print(f"   Focus:  {action['focus']}")
        if 'suggestedProject' in action:
            print(f"   Build:  {Colors.WARNING}{action['suggestedProject']}{Colors.ENDC}")
            
        print(f"{'='*60}\n")
        input("Press Enter to continue...")

    except Exception as e:
        print(f"{Colors.FAIL}❌ Failed to load progress: {e}{Colors.ENDC}")

def print_verdict(session_id, logger):
    try:
        res = requests.get(f"{API_URL}/interview/summary/{session_id}")
        summary = res.json()
        
        header = f"\n{'='*60}\n🏆 FINAL VERDICT\n{'='*60}"
        print(f"{Colors.HEADER}{header}{Colors.ENDC}")
        logger.log(header)
        
        print(f"Questions: {summary.get('totalQuestions')}")
        print(f"Final Satisfaction: {summary.get('finalSatisfaction')}/100")
        
        verdict = summary.get('verdict', '')
        if "HIRE" in verdict and "NO HIRE" not in verdict:
            print(f"\n{Colors.GREEN}{Colors.BOLD}{verdict}{Colors.ENDC}")
        else:
            print(f"\n{Colors.FAIL}{Colors.BOLD}{verdict}{Colors.ENDC}")
            
        logger.log(f"Verdict: {verdict}")
        logger.log(f"Final Satisfaction: {summary.get('finalSatisfaction')}")
            
        if summary.get('history'):
            # Show all log files
            log_summary = logger.get_summary()
            log_files = log_summary.get('log_files', {})
            print(f"\n{Colors.BOLD}📁 Log Files Saved:{Colors.ENDC}")
            for log_type, path in log_files.items():
                print(f"   - {log_type.capitalize()}: {path}")
            
    except:
        pass

def main():
    print_header()
    
    # Ensure backend is running (auto-start if needed)
    if not ensure_backend_running():
        print(f"{Colors.FAIL}❌ Could not start backend on {API_URL}{Colors.ENDC}")
        sys.exit(1)
        
    username = get_input("GitHub Username", "guest")
    
    while True:
        print(f"\n{Colors.HEADER}🔥 FAB MAIN MENU 🔥{Colors.ENDC}")
        print("1. Start New Interview")
        print("2. View Growth Progress")
        print("3. Exit")
        
        choice = get_input("Select Option", "1")
        
        if choice == "3":
            sys.exit(0)
            
        if choice == "2":
            show_progress(username)
            continue
            
        # choice 1 fallthrough to interview flow
        break

    logger = Logger(username)
    
    # Hardware Detection Phase
    print(f"\n{Colors.BLUE}🔍 Analyzing System Hardware...{Colors.ENDC}")
    hw_recommendation = detect_and_display_hardware(logger)
    
    brain_type = configure_brain(logger, hw_recommendation)
    
    # Brain Setup
    if brain_type == "remote":
        print(f"\n{Colors.BLUE}🌐 Cloud Brain Setup (Colab or Kaggle){Colors.ENDC}")
        print("Please open your Cloud environment (Colab/Kaggle) to start the brain server:")
        colab_link = "https://colab.research.google.com/drive/1DA9xJgREaDTNSvQje91ZrIOOaAlojjAs#scrollTo=1S_EfAI19Kj6"
        print(f"{Colors.CYAN}{colab_link}{Colors.ENDC}")
        webbrowser.open(colab_link)
        
        remote_url = get_input("Enter Cloud Brain URL (ngrok)")
        while True:
            # Debug info (hidden if URL is valid)
            if not remote_url:
                print(f"{Colors.FAIL}URL cannot be empty.{Colors.ENDC}")
            elif not remote_url.lower().startswith("http"):
                print(f"{Colors.FAIL}Invalid URL: '{remote_url}'. Must start with http/https{Colors.ENDC}")
            else:
                # Valid URL
                break
            
            remote_url = get_input("Retry - Enter Cloud Brain URL")
        
        try:
            requests.post(f"{API_URL}/config/brain", json={
                "brainType": brain_type,
                "remoteUrl": remote_url
            })
            print(f"{Colors.GREEN}✅ Cloud Brain configured with URL: {remote_url}{Colors.ENDC}")
            logger.log(f"Cloud Brain configured with URL: {remote_url}")
        except Exception as e:
            print(f"{Colors.FAIL}❌ Failed to configure Cloud Brain: {e}{Colors.ENDC}")
            logger.log(f"ERROR: Failed to configure Cloud Brain: {e}")
            sys.exit(1)
    else: # Local brain
        print(f"\n{Colors.BLUE}💻 Local Brain Setup{Colors.ENDC}")
        print(f"{Colors.WARNING}Ensure Ollama is running and has 'llama3' model downloaded.{Colors.ENDC}")
        print(f"   Download Ollama: {Colors.CYAN}https://ollama.com/download{Colors.ENDC}")
        print(f"   Download Llama3: {Colors.CYAN}ollama run llama3{Colors.ENDC}")
        
        try:
            requests.post(f"{API_URL}/config/brain", json={
                "brainType": brain_type,
                "remoteUrl": "" # Clear remote URL for local brain
            })
            print(f"{Colors.GREEN}✅ Local Brain configured.{Colors.ENDC}")
            logger.log("Local Brain configured.")
        except Exception as e:
            print(f"{Colors.FAIL}❌ Failed to configure Local Brain: {e}{Colors.ENDC}")
            logger.log(f"ERROR: Failed to configure Local Brain: {e}")
            sys.exit(1)
    
    resume_path = select_resume(logger)

    resume_data = analyze_resume(resume_path, username, logger)
    print(f"{Colors.GREEN}✅ Resume parsed. Found {resume_data.get('claimsFound', 0)} claims.{Colors.ENDC}")
    
    projects = analyze_github_deep(username, logger)

    # Phase 7: Training Consent
    print(f"\n{Colors.BLUE}🧠 AI Training Mode{Colors.ENDC}")
    enable_training = get_input("Enable memory of past failures? (The AI will grill you on weak spots) [y/N]", "n").lower().startswith('y')
    if enable_training:
        print(f"{Colors.GREEN}✅ Training Mode ENABLED. Prepare to be challenged!{Colors.ENDC}")
    else:
        print(f"{Colors.CYAN}ℹ️ Training Mode DISABLED. Standard interview.{Colors.ENDC}")
    
    run_interview(username, resume_data, projects, brain_type, logger, enable_training)
    
    # Final session summary
    session_summary = logger.get_summary()
    print(f"\n{Colors.CYAN}📊 Session Stats: {session_summary['api_calls']} API calls, {session_summary['fallback_count']} fallbacks{Colors.ENDC}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting...")
