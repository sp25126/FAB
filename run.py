import os
import sys
import requests
import time
import json
from datetime import datetime

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

class Logger:
    def __init__(self, context_name):
        self.filename = os.path.join(LOGS_DIR, f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{context_name}.txt")
        self.log(f"--- SESSION STARTED: {datetime.now()} ---")
        self.log(f"Context: {context_name}")
        
    def log(self, message):
        with open(self.filename, 'a', encoding='utf-8') as f:
            timestamp = datetime.now().strftime("%H:%M:%S")
            f.write(f"[{timestamp}] {message}\n")

    def log_qa(self, question, answer, feedback, score):
        self.log(f"\nQ: {question}")
        self.log(f"A: {answer}")
        self.log(f"Feedback: {feedback} (Score: {score})")

def print_header():
    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"🔥 FAB - BRUTAL TRUTH INTERVIEW AGENT 🔥")
    print(f"{'='*60}{Colors.ENDC}")

def get_input(prompt, default=None):
    text = f"{Colors.BOLD}{prompt}{Colors.ENDC}"
    if default:
        text += f" [{default}]"
    text += ": "
    val = input(text).strip()
    return val if val else default

def check_backend():
    try:
        requests.get(f"{API_URL}/health", timeout=2)
        return True
    except:
        return False

def configure_brain(logger):
    print(f"\n{Colors.BLUE}Phase 1: Brain Configuration{Colors.ENDC}")
    logger.log("Phase 1: Brain Configuration")
    
    # Check current config
    current_config = {}
    try:
        res = requests.get(f"{API_URL}/config/brain", timeout=2)
        if res.status_code == 200:
            current_config = res.json()
    except: 
        pass

    print(f"Current: {current_config.get('brainType', 'local')}")
    print("1. Local (Ollama - Requires 8GB+ RAM)")
    print("2. Remote (Google Colab GPU - Recommended)")
    
    choice = get_input("Select Brain", "2")
    
    brain_type = "remote" if choice == "2" else "local"
    remote_url = current_config.get('remoteUrl', '')
    
    if brain_type == "remote":
        default_url = remote_url if remote_url else None
        remote_url = get_input("Enter Colab ngrok URL", default_url)
        while not remote_url or not remote_url.startswith("http"):
            print(f"{Colors.FAIL}Invalid URL. Must start with http/https{Colors.ENDC}")
            remote_url = get_input("Enter Colab ngrok URL")
            
    # Update backend config
    try:
        requests.post(f"{API_URL}/config/brain", json={
            "brainType": brain_type,
            "remoteUrl": remote_url
        })
        msg = f"Brain configured: {brain_type.upper()}"
        print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")
        logger.log(msg)
    except Exception as e:
        err = f"Failed to configure brain: {e}"
        print(f"{Colors.FAIL}❌ {err}{Colors.ENDC}")
        logger.log(f"ERROR: {err}")
        sys.exit(1)
        
    return brain_type

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
            print(f"{Colors.WARNING}⚠️ GitHub analysis failed or skipped.{Colors.ENDC}")
            logger.log("GitHub analysis skipped/failed")
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

def run_interview(username, resume_data, projects, brain_type, logger):
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
        "githubStats": {}
    }
    
    # Start Session with Retries
    session = None
    for attempt in range(3):
        try:
            res = requests.post(f"{API_URL}/interview/start", json={
                "username": username,
                "context": context,
                "brainType": brain_type
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
            answer = input(f"\n{Colors.BLUE}You: {Colors.ENDC}")
            if not answer:
                print("Please provide an answer.")
                continue
                
            print(f"{Colors.WARNING}Thinking...{Colors.ENDC}")
            
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
            path = logger.filename
            print(f"\n{Colors.BOLD}Full transcript saved to: {path}{Colors.ENDC}")
            
    except:
        pass

def main():
    print_header()
    
    if not check_backend():
        print(f"{Colors.FAIL}❌ Backend not running on {API_URL}{Colors.ENDC}")
        print("Please run: cd backend && npm run dev")
        sys.exit(1)
        
    username = get_input("GitHub Username", "guest")
    logger = Logger(username)
    
    brain_type = configure_brain(logger)
    resume_path = select_resume(logger)

    resume_data = analyze_resume(resume_path, username, logger)
    print(f"{Colors.GREEN}✅ Resume parsed. Found {resume_data.get('claimsFound', 0)} claims.{Colors.ENDC}")
    
    projects = analyze_github_deep(username, logger)
    
    run_interview(username, resume_data, projects, brain_type, logger)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting...")
