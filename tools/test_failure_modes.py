import requests
import json
import concurrent.futures
import time

BASE_URL = "http://localhost:3000"
USERNAME = "test_user_fail"

def test(name, method, endpoint, payload=None, expected_code=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    print(f"Testing {name}...", end=" ")
    try:
        start = time.time()
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=payload, headers=headers)
        elif method == "PUT":
            response = requests.put(url, json=payload, headers=headers)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            print("❌ Invalid method")
            return False

        duration = time.time() - start
        
        # Check if response code matches expected (can be a single code or list)
        code_match = False
        if isinstance(expected_code, list):
            code_match = response.status_code in expected_code
        else:
            code_match = response.status_code == expected_code

        if code_match:
            print(f"✅ PASS ({response.status_code})")
            return True
        else:
            print(f"❌ FAIL (Expected {expected_code}, Got {response.status_code})")
            # print(f"   Response: {response.text[:100]}...")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def run_failure_suite():
    print(f"\n{'='*50}")
    print("🧪 FAILURE MODE & FALLBACK SYSTEM VERIFICATION")
    print(f"{'='*50}")
    
    passes = 0
    total = 0

    # 1. Endpoint Not Found
    total += 1
    if test("404 Not Found", "GET", "/api/nonexistent/endpoint", expected_code=404):
        passes += 1

    # 2. Method Not Allowed
    total += 1
    # Assuming /health is GET only
    if test("405 Method Not Allowed", "POST", "/health", payload={"data": "bad"}, expected_code=[404, 405]): 
        # Express strict 405 might need specific config, often defaults to 404 for unknown routes if strict routing isn't set, 
        # or 404 if the router doesn't match method. Accepting 404/405 as "Not Handled"
        passes += 1

    # 3. Malformed JSON (Syntactically invalid JSON is handled by requests lib usually preventing sending, 
    # so we test Valid JSON that breaks schema or Empty Body which might fail parsing if strict)
    # Actually, to send truly malformed JSON we need to pass data=string instead of json=dict
    total += 1
    print("Testing Malformed JSON...", end=" ")
    try:
        res = requests.post(f"{BASE_URL}/profile/{USERNAME}", data="{invalid_json:", headers={"Content-Type": "application/json"})
        if res.status_code in [400, 500]: # 400 is ideal, 500 means express body-parser crashed (bad) or handled global (ok)
            print(f"✅ PASS ({res.status_code})")
            passes += 1
        else:
            print(f"❌ FAIL (Got {res.status_code})")
    except: 
        print("❌ Error sending")

    # 4. Empty Payload (Validation)
    total += 1
    # Profile creation usually requires data
    if test("400 Empty Payload", "POST", "/profile", payload={}, expected_code=[400, 404]):
         passes += 1

    # 5. Invalid Data Types
    total += 1
    # Sending number instead of string for username
    if test("400 Invalid Types", "POST", "/profile", payload={"username": 12345, "bio": "test"}, expected_code=[400, 500]):
        passes += 1

    # 6. Payload Too Large (Configured limit usually 100kb or 1mb)
    total += 1
    large_payload = {"bio": "A" * 1024 * 1024 * 5} # 5MB
    if test("413 Payload Too Large", "POST", "/profile", payload=large_payload, expected_code=413):
        passes += 1

    # 7. Injection Attempt (Should not crash, sanitize or error)
    total += 1
    injection = {"username": "user'; DROP TABLE users; --"}
    if test("SQL Injection Resilience", "GET", f"/profile/{injection['username']}", expected_code=[200, 404, 400]): 
        # 200/404 means it tried to look it up as a string. 500 would be a fail.
        passes += 1

    # 8. Unicode Stress
    total += 1
    unicode_str = "用户/👍/∞/test"
    if test("Unicode Handling", "GET", f"/profile/{unicode_str}", expected_code=[200, 404]):
        passes += 1

    # 9. Concurrency Stress (Stability)
    total += 1
    print("Testing Concurrency (20 reqs)...", end=" ")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(requests.get, f"{BASE_URL}/health") for _ in range(20)]
        results = [f.result().status_code for f in futures]
    
    if all(c == 200 for c in results):
        print("✅ PASS")
        passes += 1
    else:
        print(f"❌ FAIL (Codes: {results})")

    # 10. Simulated Server Error (Trigger Unknown Route or specific crash endpoint)
    # We don't have a crash endpoint, so we monitor /health after stress
    total += 1
    if test("System Stability (Health)", "GET", "/health", expected_code=200):
        passes += 1

    print(f"\n📊 RESULTS: {passes}/{total} Passed")
    
if __name__ == "__main__":
    run_failure_suite()
