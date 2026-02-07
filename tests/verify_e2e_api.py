
import requests
import time
import sys

API_URL = "http://localhost:3000"
USERNAME = "saumya_test_e2e"
CLOUD_URL = "https://9519-136-111-22-251.ngrok-free.app"

def run_verification():
    print("🚀 Starting E2E Verification (API Mode)...")
    
    # 1. Configure Brain (Simulate run.py logic)
    print(f"\n1. Configuring Cloud Brain: {CLOUD_URL}")
    try:
        res = requests.post(f"{API_URL}/config/brain", json={
            "brainType": "remote",
            "remoteUrl": CLOUD_URL
        }, timeout=5)
        if res.status_code == 200:
            print("✅ Brain Configured.")
        else:
            print(f"❌ Brain Config Failed: {res.text}")
            return
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        return

    # 2. Simulate Resume Analysis (Mocking what run.py does)
    # run.py reads a bio/pdf and sends it. We'll send a mock context directly to /interview/start 
    # as if run.py had already parsed it.
    print(f"\n2. Starting Interview Session for {USERNAME}...")
    
    context = {
        "skills": ["Python", "Node.js", "System Design"],
        "projects": [
            {"name": "FAB", "description": "AI Interviewer with Agentic capabilities", "architecture": "Microservices"}
        ],
        "summary": "Senior Engineer with 8 years exp."
    }

    try:
        res = requests.post(f"{API_URL}/interview/start", json={
            "username": USERNAME,
            "brainType": "remote",
            "context": context
        }, timeout=30)
        
        if res.status_code != 200:
            print(f"❌ Interview Start Failed: {res.text}")
            return
            
        session = res.json()
        sid = session['sessionId']
        print(f"✅ Session Started. ID: {sid}")
        print(f"   First Question: {session['firstQuestion']}")

        # 3. Simulate Interaction Loop
        for i in range(3):
            print(f"\n3.{i+1} Sending Answer...")
            answer = f"I designed the system to be scalable using sharding and replication. (Answer {i})"
            
            res = requests.post(f"{API_URL}/interview/answer", json={
                "sessionId": sid,
                "answer": answer
            }, timeout=60) # Long timeout for Cloud Brain
            
            if res.status_code != 200:
                print(f"❌ Answer Failed: {res.text}")
                break
                
            data = res.json()
            print(f"   Feedback: {data.get('feedback')[:100]}...")
            print(f"   Score: {data.get('score')}")
            
            if data.get('done'):
                print("   Session Completed naturally.")
                break
                
            print(f"   Next Q: {data.get('nextQuestion')['text'] if isinstance(data.get('nextQuestion'), dict) else data.get('nextQuestion')}")
            time.sleep(2)

        # 4. Check Growth Dashboard
        print(f"\n4. Checking Growth Dashboard...")
        res = requests.get(f"{API_URL}/progress/{USERNAME}")
        if res.status_code == 200:
            prog = res.json()
            print(f"✅ Growth Data: Total Interviews {prog['totalInterviews']}, Score {prog['currentScore']}")
        else:
             # It might fail if we didn't complete the session. 
             # Let's force complete if needed? No, server handles it.
             print(f"⚠️ Growth Data check failed (might be expected if mock didn't finish): {res.status_code}")

    except Exception as e:
        print(f"❌ verification Error: {e}")

if __name__ == "__main__":
    run_verification()
