
import requests
import time
import json

API_URL = "http://localhost:3000"
USERNAME = "phase7_tester"

def run_test():
    print("🚀 Verifying Phase 7: AI Personalization & Architecture")

    # 1. Create a "Bad" History Record (to seed weaknesses)
    print("\n1. Seeding History with Weaknesses...")
    # calculating sessionId
    session_id = f"test_session_{int(time.time())}"
    
    # We can't easily inject history via API without running a full session.
    # But we can rely on the fact that 'HistoryStorage' reads from JSON files.
    # Let's try to run a quick failed session via API.
    
    # Start Session
    res = requests.post(f"{API_URL}/interview/start", json={
        "username": USERNAME,
        "context": { "skills": ["Node.js"], "projects": [] } # Minimal context
    })
    sid = res.json()['sessionId']
    print(f"   Started session {sid}")

    # Answer poorly to 5 questions to trigger 'FAIL' and 'General' weakness
    for i in range(5):
        res = requests.post(f"{API_URL}/interview/answer", json={
            "sessionId": sid,
            "answer": "I don't know." # Terrible answer
        })
        time.sleep(0.5)

    print("   Session completed (poorly).")

    # 2. Verify Detailed Project Suggestion
    print("\n2. Requesting AI-Driven Project Spec...")
    # This triggers the new 'generateProjectSpec' in server.ts
    res = requests.get(f"{API_URL}/progress/{USERNAME}/next-action")
    data = res.json()
    
    if 'projectSpec' in data:
        print("✅ SUCCESS: Received Detailed Project Spec")
        spec = data['projectSpec']
        print(json.dumps(spec, indent=2))
        
        # Validation
        if spec.get('title') and spec.get('techStack'):
            print("   Structure looks valid.")
        else:
            print("❌ Structure invalid.")
    else:
        print("❌ FAILED: No projectSpec returned.")
        print(data)

if __name__ == "__main__":
    run_test()
