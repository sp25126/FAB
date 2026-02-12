import requests
import json
import time

BASE_URL = "http://localhost:3000"
USERNAME = "test_user_phase44"

def test_github_flow():
    print(f"Testing GitHub Flow for {USERNAME}...")

    # 1. List Repos (Fast)
    print("\n--- Step 1: List Repos ---")
    try:
        # Use a real username known to have repos if possible, but for test logic, let's try 'torvalds' (or just fail gracefully)
        # Or mock it if backend supports mocks. The backend fetches real GitHub data.
        # Let's use 'fab-agent' or something if available, or just handle errors.
        # Actually, let's use a very popular repo owner like 'defunkt' or 'mojombo' to be safe.
        target_user = "torvalds" 
        
        start = time.time()
        res = requests.post(f"{BASE_URL}/github/repos", json={"username": target_user})
        duration = time.time() - start
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ /github/repos succeeded in {duration:.2f}s")
            print(f"   Found {data['repoCount']} repos")
            if data['repos']:
                print(f"   Sample: {data['repos'][0]['name']}")
        else:
            print(f"❌ /github/repos failed: {res.status_code} - {res.text}")
            return

    except Exception as e:
        print(f"❌ Exception in Step 1: {e}")
        return

    # 2. Deep Analyze (Top 2)
    print("\n--- Step 2: Deep Analyze (Top 2) ---")
    try:
        start = time.time()
        res = requests.post(f"{BASE_URL}/github/analyze-deep", json={"username": target_user, "count": 2})
        duration = time.time() - start
        
        if res.status_code == 200:
            data = res.json()
            print(f"✅ /github/analyze-deep succeeded in {duration:.2f}s")
            print(f"   Analyzed {data['projectCount']} projects")
            print(f"   Mode: {data['analysisMode']}")
            
            # Check for Learned Skills (Simulated if Local Brain)
            projects = data['projects']
            skills_found = False
            for p in projects:
                if 'learnedSkills' in p: # interface might differ slightly in JSON response
                     print(f"   Project '{p['name']}' skills: {p.get('learnedSkills', [])}")
                     if p.get('learnedSkills'):
                         skills_found = True
            
            if not skills_found:
                print("⚠️ No learned skills found in response projects (might be expected for Light mode)")

    except Exception as e:
        print(f"❌ Exception in Step 2: {e}")
        return

    # 3. Verify Profile Skills Persistence
    print("\n--- Step 3: Verify Persistence ---")
    try:
        res = requests.get(f"{BASE_URL}/profile/{target_user}")
        if res.status_code == 200:
            profile = res.json()
            skills = profile.get('skills', {})
            print(f"✅ Profile fetched for {target_user}")
            print(f"   Total Skills: {len(skills)}")
            # print(f"   Skills: {json.dumps(skills, indent=2)}")
        else:
            print(f"❌ Failed to fetch profile: {res.status_code}")

    except Exception as e:
         print(f"❌ Exception in Step 3: {e}")

if __name__ == "__main__":
    test_github_flow()
