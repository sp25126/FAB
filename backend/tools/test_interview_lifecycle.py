import requests
import time
import json

BASE_URL = "http://localhost:3000/api"

def test_interview_lifecycle():
    print("Testing Interview Lifecycle (Endless Mode + Time Limit)...")
    
    # 1. Start Interview
    print("1. Starting Interview...")
    try:
        response = requests.post(f"{BASE_URL}/interview/start", json={
            "username": "test_user",
            "context": {"resume": "Resume text..."},
            "brainType": "local"
        })
        if response.status_code != 200:
            print(f"Failed to start: {response.text}")
            return
            
        session_id = response.json().get("sessionId")
        print(f"Session ID: {session_id}")
        
        # 2. Answer Questions (Simulator)
        # We want to see if it lets us go beyond 5 questions (old limit was 5 or 10)
        # We also want to see if it stops after 12 mins (we can't wait 12 mins in a test easily)
        # But we can check if it returns `done: false` for many questions.
        
        for i in range(1, 15): # Try 15 questions
            print(f"Answer {i}...")
            ans_res = requests.post(f"{BASE_URL}/interview/answer", json={
                "sessionId": session_id,
                "answer": f"This is a simulated answer for question {i}. I am demonstrating knowledge."
            })
            
            data = ans_res.json()
            print(f"Q{i} Result: Done={data.get('done')}, Satisfaction={data.get('satisfaction')}")
            
            if data.get('done'):
                print("Interview ended early!")
                break
            
            # small delay
            time.sleep(0.5)
            
    except Exception as e:
        print(f"Test Failed: {e}")

if __name__ == "__main__":
    test_interview_lifecycle()
