import requests
import json
import time

BASE_URL = "http://localhost:3000"
USER = "growth_test_user_v1"

def run_growth_test():
    print(f"📊 TESTING GROWTH TRACKER FOR USER: {USER}")
    
    # 1. Check Initial Progress
    print("1. Checking initial progress (and creating user)...")
    # Ensure user exists!
    requests.post(f"{BASE_URL}/profile", json={
        "username": USER, 
        "bio": "Test User", 
        "experienceLevel": "Junior"
    })

    r = requests.get(f"{BASE_URL}/progress/{USER}")
    initial_history_len = 0
    if r.status_code == 200:
        data = r.json()
        initial_history_len = len(data.get('history', []))
        print(f"   Initial history length: {initial_history_len}")
    else:
        print("   User might be new.")

    # 2. Start Interview
    print("2. Starting Mock Interview...")
    r = requests.post(f"{BASE_URL}/interview/start", json={"username": USER, "brainType": "local"})
    if r.status_code != 200:
        print(f"❌ Failed to start interview: {r.status_code}")
        return
    
    session_id = r.json().get("sessionId")
    print(f"   Session ID: {session_id}")

    # 3. Simulate questions (Loop until done)
    print("3. Answering questions to complete interview...")
    # Answer strongly to potentially trigger early exit > 85
    ans = "I have 10 years of experience designing scalable distributed systems using microservices, Kafka, and Kubernetes. I optimized query latency by 50% using Redis caching and proper indexing strategies."
    
    for i in range(30):
        print(f"   Answering Q{i+1}...")
        r = requests.post(f"{BASE_URL}/interview/answer", json={"sessionId": session_id, "answer": ans})
        if r.status_code != 200:
            print(f"❌ Error answering: {r.status_code}")
            break
        res = r.json()
        print(f"     Satisfaction: {res.get('satisfaction')}")
        
        if res.get("done"):
            print(f"   ✅ Interview Completed in {i+1} turns.")
            break
        time.sleep(0.2)
        
    # 4. Check Progress AGAIN
    print("4. Checking Progress Update...")
    # Wait a moment for async DB writes if any
    time.sleep(1)
    
    r = requests.get(f"{BASE_URL}/progress/{USER}")
    if r.status_code == 200:
        data = r.json()
        new_history = data.get('history', [])
        print(f"   New history length: {len(new_history)}")
        
        # Check for specific entry
        interview_entries = [h for h in new_history if h.get('metric') == 'interview_score']
        if len(interview_entries) > 0:
            latest = interview_entries[-1]
            print(f"✅ SUCCESS: Found growth entry!")
            print(f"   Metric: {latest.get('metric')}")
            print(f"   Value: {latest.get('value')}")
            print(f"   Timestamp: {latest.get('timestamp')}")
            print("\nThis data maps directly to the Chart in frontend.")
        else:
            print("❌ FAILURE: No 'interview_score' entry found in history.")
            print(f"History dump: {json.dumps(new_history, indent=2)}")
    else:
        print(f"❌ Failed to get progress: {r.status_code}")

if __name__ == "__main__":
    run_growth_test()
