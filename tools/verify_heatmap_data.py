import requests
import json

BASE_URL = "http://localhost:3000"
USERNAME = "torvalds" # Must be real GitHub user for analysis to work

def verify_progress_data():
    print(f"Verifying Progress Data for {USERNAME}...")
    
    # 1. Create User
    requests.post(f"{BASE_URL}/profile", json={
        "username": USERNAME, 
        "bio": "Test Bio", 
        "experienceLevel": "Junior"
    })

    # 2. Simulate Activity (Github Analysis)
    # We use the legacy endpoint or deep one, strictly to trigger history
    # For speed, we can mock or just assume the server handles it if we send a valid request.
    # Actually, let's just use the profile repo if we could, but we can't from here.
    # We'll use a real analyze call with a dummy repo or just relying on "User not found" being fixed by step 1.
    # We'll use 'torvalds' again as target but for OUR username
    requests.post(f"{BASE_URL}/github/analyze-deep", json={
        "username": USERNAME,
        "count": 1
        # No token -> Light mode
    })

    # 3. Fetch Progress
    try:
        res = requests.get(f"{BASE_URL}/progress/{USERNAME}")
        if res.status_code == 200:
            data = res.json()
            history = data.get('history', [])
            print(f"✅ /progress/{USERNAME} succeeded")
            print(f"   History Items: {len(history)}")
            
            if len(history) > 0:
                print(f"   Sample Item: {history[0]}")
                if 'date' in history[0] and 'metric' in history[0]:
                    print("✅ History structure is valid for Heatmap")
                else:
                    print("❌ History structure INVALID")
            else:
                print("⚠️ History is empty (Heatmap will be blank)")
        else:
            print(f"❌ Failed to fetch progress: {res.status_code}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    verify_progress_data()
