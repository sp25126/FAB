import requests
import json
import time

BASE_URL = "http://localhost:3000"
RESUME_PATH = r"c:\Users\saumy\OneDrive\Desktop\FAB\resumes\Fake_Web_Developer_Resume.pdf"
GITHUB_TOKEN = "ghp_YOUR_TOKEN_HERE"
GITHUB_USER = "torvalds"  # Or extract from token/resume? Let's use torvalds for deep analysis test or the user associated with token if needed. 
# actually, the token belongs to 'saumy', probably. Let's use 'torvalds' for public analysis as requested? 
# "input my real credentials" -> usually means use the token for authenticated requests. 
# The resume is "Fake_Web_Developer_Resume.pdf". 
# The script should:
# 1. Upload Resume (POST /verify-resume-file)
# 2. Analyze GitHub (POST /analyze-github with Token)
# 3. Start Interview (POST /interview/start)
# 4. Answer Questions (POST /interview/answer)
# 5. Check Progress stats

def run_e2e():
    print("🚀 STARTING E2E SCENARIO SIMULATION (Phase 42)")
    print(f"   Target: {BASE_URL}")
    print(f"   Resume: {RESUME_PATH}")
    print(f"   GitHub Token: {GITHUB_TOKEN[:4]}...{GITHUB_TOKEN[-4:]}")

    # 1. RESUME UPLOAD
    print("\n1️⃣ Verifying Resume Upload...")
    try:
        with open(RESUME_PATH, 'rb') as f:
            files = {'resume': (RESUME_PATH, f, 'application/pdf')}
            data = {'username': 'e2e_real_user'}
            r = requests.post(f"{BASE_URL}/verify-resume-file", data=data, files=files)
            
            if r.status_code == 200:
                res = r.json()
                print(f"   ✅ Resume Verified! Claims Found: {res.get('claimsFound')}")
                print(f"   Honesty Score: {res.get('summary', {}).get('honestyScore')}")
            else:
                print(f"   ❌ Resume failed: {r.status_code} - {r.text}")
                return
    except Exception as e:
        print(f"   ❌ Resume Upload Error: {e}")
        return

    # 2. GITHUB ANALYSIS (Authenticated)
    print("\n2️⃣ Analyze GitHub (Authenticated)...")
    # Using 'torvalds' as a hefty target, or we could use the user actually associated with the token.
    # But usually token is key. Let's stick to a known heavy user 'torvalds' to stress test deep analysis with token.
    r = requests.post(f"{BASE_URL}/analyze-github", 
                      json={"username": "torvalds", "token": GITHUB_TOKEN}, 
                      timeout=60) # Extended timeout for deep analysis if needed
    
    if r.status_code == 200:
        res = r.json()
        mode = res.get('analysisMode')
        count = res.get('projectCount')
        print(f"   ✅ GitHub Analyzed! Mode: {mode}, Projects: {count}")
        if mode == 'DEEP':
            print("   (Authenticated Request Successful)")
        else:
            print("   ⚠️ Wanted DEEP mode but got LIGHT (Token limits?)")
    else:
        print(f"   ❌ GitHub failed: {r.status_code} - {r.text}")

    # 3. INTERVIEW (Remote Brain)
    print("\n3️⃣ Interview Session (Remote Brain)...")
    # Using the e2e_real_user we just created via resume upload (implicitly created in verify-resume?)
    # Wait, verify-resume updates existing user or fails if not found? 
    # Actually server.ts: verify-resume updates profileRepo.updateSkills... 
    # but does it create the user if not exists? 
    # Let's check server.ts... Ah, verify-resume does NOT create user explicitly? 
    # It calls updateSkills -> which creates shell profile if not found!
    # So 'e2e_real_user' exists now.
    
    r = requests.post(f"{BASE_URL}/interview/start", 
                      json={"username": "e2e_real_user", "brainType": "remote"})
    
    if r.status_code == 200:
        res = r.json()
        session_id = res.get('sessionId')
        q1 = res.get('firstQuestion')
        print(f"   ✅ Interview Started! Session: {session_id}")
        print(f"   Q1: {q1}")
        
        # Answer Loop
        for i in range(5):
             time.sleep(1)
             ans = f"Answer to Q{i+1}: I have experience with this technology and have used it in production."
             print(f"   Answering Q{i+1}...")
             r_ans = requests.post(f"{BASE_URL}/interview/answer", 
                                  json={"sessionId": session_id, "answer": ans})
             if r_ans.status_code == 200:
                res_ans = r_ans.json()
                print(f"     Score: {res_ans.get('score')}")
                if res_ans.get("done"):
                    print("   ✅ Interview Completed!")
                    break
             else:
                 print(f"   ❌ Answer failed: {r_ans.status_code}")
                 break
    else:
        print(f"   ❌ Interview start failed: {r.status_code} - {r.text}")


if __name__ == "__main__":
    run_e2e()
