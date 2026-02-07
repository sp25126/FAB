
import subprocess
import time
import sys
import threading

def read_output(process):
    """Continuously read and print output from the process."""
    try:
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
                sys.stdout.flush()
    except Exception:
        pass

def run_simulation():
    print("🚀 Starting run.py simulation...")
    
    # Start run.py as a subprocess
    process = subprocess.Popen(
        [sys.executable, 'run.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=r'c:/Users/saumy/OneDrive/Desktop/FAB'
    )

    # Start output reader thread
    t = threading.Thread(target=read_output, args=(process,))
    t.daemon = True
    t.start()

    # Define inputs and delays
    # Sequence: 
    # 1. GitHub Username (default: guest) -> Enter
    # 2. Menu: 1. Start New Interview -> "1"
    # 3. Brain Type: 2. Cloud -> "2"
    # 4. Cloud URL -> "https://9519-136-111-22-251.ngrok-free.app"
    # 5. Resume Selection: 1 -> "1"
    # 6. GitHub Token -> "" (Skip)
    # 7. Interview Answers...
    
    inputs = [
        ("saumya_test", 2),   # Username
        ("1", 2),             # Start New Interview
        ("2", 2),             # Cloud Brain
        ("https://9519-136-111-22-251.ngrok-free.app", 2), # URL
        ("1", 5),             # Resume 1 (wait 5s for analysis)
        ("", 10),             # GitHub Token (skip) - wait for deep scan
        ("I built a scalable backend using Node.js and Redis.", 5), # Q1 Answer
        ("We used Redis for caching user sessions and leaderboard data.", 5), # Q2 Answer
        ("quit", 5)           # End Interview
    ]

    try:
        for inp, delay in inputs:
            time.sleep(delay)
            print(f"\n[SIMULATOR] Sending input: '{inp}'")
            process.stdin.write(inp + "\n")
            process.stdin.flush()
            
        # Keep alive to read final output
        time.sleep(5)
        
    except Exception as e:
        print(f"Simulation error: {e}")
    finally:
        process.terminate()

if __name__ == "__main__":
    run_simulation()
