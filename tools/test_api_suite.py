
import requests
import time
import json
import sys

BASE_URL = "http://localhost:3000"
USERNAME = "sp25126" # Using the user's username
RED = "\033[91m"
GREEN = "\033[92m"
RESET = "\033[0m"

def test(name, method, endpoint, payload=None):
    url = f"{BASE_URL}{endpoint}"
    print(f"Testing {name} [{method} {endpoint}]...", end=" ")
    try:
        start = time.time()
        if method == "GET":
            res = requests.get(url)
        elif method == "POST":
            res = requests.post(url, json=payload)
        
        duration = round((time.time() - start) * 1000)
        
        if res.status_code in [200, 201]:
            print(f"{GREEN}PASS{RESET} ({duration}ms)")
            return True, res.json()
        else:
            print(f"{RED}FAIL{RESET} ({res.status_code})")
            print(f"   Response: {res.text[:200]}")
            return False, None
    except Exception as e:
        print(f"{RED}ERROR{RESET}: {str(e)}")
        return False, None

def run_suite(iteration):
    print(f"\n{'='*50}")
    print(f"🧪 API TEST SUITE - ITERATION {iteration}")
    print(f"{'='*50}")
    
    success_count = 0
    total_tests = 0
    
    # 1. Health
    ok, _ = test("Health Check", "GET", "/health")
    if ok: success_count += 1
    total_tests += 1

    # 2. Brain Config
    ok, _ = test("Brain Config", "GET", "/config/brain")
    if ok: success_count += 1
    total_tests += 1
    
    # 3. Profile
    ok, _ = test("Get Profile", "GET", f"/profile/{USERNAME}")
    if ok: success_count += 1
    total_tests += 1
    
    # 4. Progress (NEW)
    ok, data = test("Get Progress", "GET", f"/progress/{USERNAME}")
    if ok: 
        success_count += 1
        # print("   Stats:", json.dumps(data.get('stats', {})))
    total_tests += 1

    ok, _ = test("Get Projects", "GET", f"/progress/{USERNAME}/projects")
    if ok: success_count += 1
    total_tests += 1

    ok, _ = test("Get Next Action", "GET", f"/progress/{USERNAME}/next-action")
    if ok: success_count += 1
    total_tests += 1
    
    # 5. Coaching
    ok, _ = test("Get Coaching Suggestion", "GET", f"/coaching/suggest/{USERNAME}")
    if ok: success_count += 1
    total_tests += 1
    
    print(f"\n📊 Result: {success_count}/{total_tests} Passed")
    return success_count == total_tests

if __name__ == "__main__":
    print("🚀 Starting 3-Pass Validation...")
    for i in range(1, 4):
        if not run_suite(i):
            print(f"\n{RED}🛑 Suite failed on iteration {i}. Stopping.{RESET}")
            sys.exit(1)
        time.sleep(1)
    
    print(f"\n{GREEN}✅ ALL 3 ITERATIONS PASSED. SYSTEM STABLE.{RESET}")
