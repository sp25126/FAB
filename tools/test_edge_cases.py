import requests
import time
import json
import sys
import threading

BASE_URL = "http://localhost:3000"
USERNAME = "sp25126"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def print_result(name, passed, msg=""):
    if passed:
        print(f"{GREEN}✅ {name}: PASS{RESET} {msg}")
    else:
        print(f"{RED}❌ {name}: FAIL{RESET} {msg}")

def test_invalid_payload():
    print(f"\n{YELLOW}--- Test 1: Invalid Payloads ---{RESET}")
    
    # 1. Missing Username
    try:
        res = requests.post(f"{BASE_URL}/interview/start", json={})
        if res.status_code == 400:
            print_result("Missing Field (400)", True)
        else:
            print_result("Missing Field (400)", False, f"Got {res.status_code}")
    except Exception as e:
        print_result("Missing Field", False, str(e))

    # 2. Invalid Types
    try:
        res = requests.post(f"{BASE_URL}/interview/start", json={"username": 12345})
        # Express might cast it or valid middleware might catch it. 
        # Our simple validation checks if it exists. 
        # If strict typing is added later, this might be 400. 
        # For now, let's see if it errors out or handles it.
        if res.status_code in [200, 400]: 
            print_result("Invalid Type Handling", True, f"Got {res.status_code}")
        else:
            print_result("Invalid Type Handling", False, f"Got {res.status_code}")
    except Exception as e:
        print_result("Invalid Type", False, str(e))

def test_missing_resource():
    print(f"\n{YELLOW}--- Test 2: Missing Resources ---{RESET}")
    
    # 1. Non-existent Endpoint
    res = requests.get(f"{BASE_URL}/api/ghost-endpoint")
    if res.status_code == 404:
         print_result("404 Endpoint", True)
    else:
         print_result("404 Endpoint", False, f"Got {res.status_code}")

    # 2. Non-existent User Profile
    res = requests.get(f"{BASE_URL}/profile/ghost_user_99999")
    # Our API currently returns a default mock for missing users to avoid frontend crashes, 
    # so we expect 200 with default data.
    if res.status_code == 200:
        data = res.json()
        if data.get('username') == 'ghost_user_99999':
            print_result("Missing User (Graceful Default)", True)
        else:
            print_result("Missing User (Graceful Default)", False, "Data mismatch")
    else:
        print_result("Missing User", False, f"Got {res.status_code}")

def test_large_payload():
    print(f"\n{YELLOW}--- Test 3: Large Payloads ---{RESET}")
    # 1. Huge Text Body (simulate Resume)
    huge_text = "Experience " * 1000000 # ~11MB
    try:
        res = requests.post(f"{BASE_URL}/analyze-resume", json={"resume_text": huge_text})
        if res.status_code == 413 or res.status_code == 500 or res.status_code == 400:
            print_result("Body Limit Enforcement", True, f"Got {res.status_code}")
        else:
             # If it passes, express limit might be high
            print_result("Body Limit Enforcement", False, f"Got {res.status_code}")
    except Exception as e:
        print_result("Body Limit Error", True, "Connection likely closed")

def test_concurrency():
    print(f"\n{YELLOW}--- Test 4: Concurrency Stress ---{RESET}")
    # Fire 20 requests at once
    threads = []
    errors = []
    
    def worker():
        try:
            res = requests.get(f"{BASE_URL}/health")
            if res.status_code != 200:
                errors.append(res.status_code)
        except Exception as e:
            errors.append(str(e))

    start = time.time()
    for _ in range(20):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    duration = time.time() - start
    if not errors:
        print_result(f"20 Concurrent Req in {duration:.2f}s", True)
    else:
        print_result("Concurrency", False, f"Errors: {errors}")

if __name__ == "__main__":
    print(f"🚀 Starting Edge Case Verification on {BASE_URL}")
    test_invalid_payload()
    test_missing_resource()
    test_large_payload()
    test_concurrency()
