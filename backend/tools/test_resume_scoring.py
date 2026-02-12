import requests
import json
import os

# mock resume text with evident complexity
RESUME_TEXT = """
PROJECTS
High-Frequency Trading Engine
- Built a low-latency trading engine using C++ and FPGA.
- Optimized network stack for microsecond precision.
- Implemented market data arbitration using Paxos.

Personal Portfolio
- Simple HTML/CSS website hosted on GitHub Pages.
"""

def test_resume_scoring():
    print("Testing Resume Scoring (Complexity & Architecture)...")
    
    url = "http://localhost:3000/verify-resume-file"
    
    try:
        # Create dummy file
        with open("temp_scoring_resume.txt", "w") as f:
            f.write(RESUME_TEXT)
            
        print("Sending request to backend...")
        # Open file in rb mode for the request
        with open('temp_scoring_resume.txt', 'rb') as f_read:
            files = {'resume': f_read}
            data = {'username': 'test_user'}
            response = requests.post(url, files=files, data=data)
        
        if response.status_code == 200:
            res_json = response.json()
            projects = res_json.get('projects', [])
            print(f"Found {len(projects)} projects.")
            
            for p in projects:
                print(f"Project: {p['name']}")
                print(f"  Complexity: {p.get('complexity')}")
                print(f"  Architecture: {p.get('architecture')}")
                print(f"  Learned Skills: {p.get('learnedSkills')}")
                print("-" * 20)
                
            # Basic assertions
            if len(projects) >= 2:
                p1 = next((p for p in projects if "Trading" in p['name']), None)
                p2 = next((p for p in projects if "Portfolio" in p['name']), None)
                
                if p1 and p1.get('complexity') == 'ADVANCED':
                    print("✅ Trading Engine identified as ADVANCED")
                else:
                    print(f"❌ Trading Engine complexity mismatch: {p1.get('complexity') if p1 else 'Not Found'}")
                    
                if p2 and p2.get('complexity') == 'BASIC':
                    print("✅ Portfolio identified as BASIC")
                else:
                    print(f"❌ Portfolio complexity mismatch: {p2.get('complexity') if p2 else 'Not Found'}")
        else:
            print(f"Request failed: {response.status_code} {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists("temp_scoring_resume.txt"):
            os.remove("temp_scoring_resume.txt")

if __name__ == "__main__":
    test_resume_scoring()
