import platform
import psutil
import shutil
import subprocess
import json

class HardwareDetector:
    def __init__(self):
        self.system = platform.system()
        self.specs = {
            "os": self.system,
            "cpu_cores": psutil.cpu_count(logical=True),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "gpu": None,
            "vram_gb": 0,
            "recommendation": "CLOUD"  # Default to CLOUD for safety
        }

    def detect_gpu(self):
        """Detect GPU and VRAM based on OS."""
        try:
            if self.system == "Windows":
                # Use wmic to get GPU name
                cmd = "wmic path win32_VideoController get Name,AdapterRAM"
                output = subprocess.check_output(cmd, shell=True).decode()
                lines = output.strip().split('\n')
                if len(lines) > 1:
                    # Parse the last line (often the dedicated GPU)
                    parts = lines[-1].strip().split()
                    if len(parts) >= 2:
                        # Extract RAM (AdapterRAM is in bytes)
                        try:
                            # Last part is usually RAM, rest is Name
                            ram_bytes = int(parts[-1])
                            name = " ".join(parts[:-1])
                            
                            # Valid GPU check (ignore basic display adapters if possible)
                            self.specs["gpu"] = name
                            self.specs["vram_gb"] = round(ram_bytes / (1024**3), 2)
                        except:
                            self.specs["gpu"] = "Unknown (Detection Failed)"
            
            elif self.system == "Linux":
                # Try nvidia-smi
                try:
                    output = subprocess.check_output("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", shell=True).decode()
                    name, memory = output.strip().split(',')
                    self.specs["gpu"] = name.strip()
                    self.specs["vram_gb"] = float(memory.lower().replace('mib', '').strip()) / 1024
                except:
                    pass
                    
            elif self.system == "Darwin":
                # MacOS (system_profiler)
                cmd = "system_profiler SPDisplaysDataType"
                output = subprocess.check_output(cmd, shell=True).decode()
                if "Chipset Model" in output:
                    for line in output.split('\n'):
                        if "Chipset Model" in line:
                            self.specs["gpu"] = line.split(":")[1].strip()
                            break
        
        except Exception as e:
            print(f"GPU Detection Error: {e}")

    def analyze_capability(self):
        """Analyze specs and recommend Brain Mode."""
        # Criteria for LOCAL mode:
        # 1. At least 16GB RAM (for CPU inference) OR
        # 2. At least 6GB VRAM (for GPU inference)
        
        is_powerful = False
        reasons = []

        if self.specs["ram_total_gb"] >= 16:
            is_powerful = True
            reasons.append(f"High RAM ({self.specs['ram_total_gb']}GB)")
        
        if self.specs["vram_gb"] >= 6:
            is_powerful = True
            reasons.append(f"Good GPU VRAM ({self.specs['vram_gb']}GB)")
            
        if is_powerful:
            self.specs["recommendation"] = "LOCAL"
            self.specs["reason"] = f"Your system is capable! ({', '.join(reasons)})"
        else:
            self.specs["recommendation"] = "CLOUD"
            self.specs["reason"] = "System resources limited for heavy AI models. Offloading recommended."

    def detect_all(self):
        self.detect_gpu()
        self.analyze_capability()
        return self.specs

    def get_display_summary(self):
        """Return a formatted string for the CLI."""
        s = self.specs
        gpu_str = f"{s['gpu']} ({s['vram_gb']}GB VRAM)" if s['gpu'] else "Integrated/Unknown"
        
        return f"""
========================================
🖥️  SYSTEM HARDWARE DETECTED
========================================
OS:       {s['os']}
CPU:      {s['cpu_cores']} Cores
RAM:      {s['ram_total_gb']} GB
GPU:      {gpu_str}
----------------------------------------
RECOMMENDATION: {s['recommendation']}
Reason: {s.get('reason', '')}
========================================
"""

if __name__ == "__main__":
    detector = HardwareDetector()
    detector.detect_all()
    print(detector.get_display_summary())
