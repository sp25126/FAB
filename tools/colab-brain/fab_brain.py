# FAB CLOUD BRAIN (v13.1 - Cloud Agnostic)
# heavy tasking enabled: Qwen 2.5-1.5B (Fast & Light) + SentenceBERT
# Compatible with Google Colab (T4) and Kaggle (T4/P100)

#===============================================
# STEP 1: Install Dependencies
#===============================================
print("📦 Installing dependencies...")
import os
os.system("pip install -q fastapi uvicorn pydantic transformers torch accelerate bitsandbytes pyngrok nest-asyncio sentencepiece sentence-transformers")

#===============================================
# STEP 2: Configure Ngrok
#===============================================
# ⚠️ REPLACE THIS WITH YOUR TOKEN ⚠️
NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE" 

import nest_asyncio
from pyngrok import ngrok, conf
import time
import json

nest_asyncio.apply()

print("🔐 Authenticating with ngrok...")
conf.get_default().auth_token = NGROK_TOKEN
ngrok.kill()

#===============================================
# STEP 3: Load Heavy Models (Targeting ~8GB VRAM)
#===============================================
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel, BitsAndBytesConfig
from sentence_transformers import SentenceTransformer
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

# 1. Primary LLM: Qwen 2.5-1.5B-Instruct
# Size: ~3GB in 4-bit. Fast & Capable.
LLM_ID = "Qwen/Qwen2.5-1.5B-Instruct"
print(f"🧠 Loading Main LLM: {LLM_ID}...")
tokenizer = AutoTokenizer.from_pretrained(LLM_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    LLM_ID, 
    device_map="auto", 
    trust_remote_code=True,
    torch_dtype=torch.float16
)
print("✅ Qwen 1.5B Loaded!")

# 2. Code Understanding: Handled by LLM directly (CodeBERT removed for memory safety)
# This saves ~1GB VRAM and avoids OOM.

# 3. Semantic Search: Sentence-BERT
# Size: ~0.5GB. For resume/job matching.
print("📊 Loading Sentence-BERT...")
sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
if torch.cuda.is_available():
    sentence_model = sentence_model.to("cuda")
print("✅ Sentence-BERT Loaded!")

# Log GPU usage
if torch.cuda.is_available():
    gpu_mem = torch.cuda.memory_allocated() / 1024**3
    gpu_total = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"\n🎮 GPU: {torch.cuda.get_device_name(0)}")
    print(f"💾 VRAM Used: {gpu_mem:.2f} GB / {gpu_total:.2f} GB")

#===============================================
# STEP 4: Core Functions
#===============================================
def generate_text(prompt: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.3) -> str:
    messages = [
        {"role": "system", "content": system_prompt or "You are a helpful AI assistant."},
        {"role": "user", "content": prompt}
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    generated_ids = model.generate(
        **model_inputs, max_new_tokens=max_tokens, temperature=temperature,
        do_sample=True if temperature > 0 else False
    )
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):]
    return tokenizer.decode(output_ids, skip_special_tokens=True)

def get_formatted_prompt(prompt: str) -> str:
    # Helper to clean prompts if needed
    return prompt

def extract_json(text: str):
    import re
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if json_match:
        text = json_match.group(1)
    
    # Try to find { } or [ ]
    start_arr, start_obj = text.find('['), text.find('{')
    if start_arr != -1 and (start_obj == -1 or start_arr < start_obj):
        end = text.rfind(']') + 1
        return json.loads(text[start_arr:end]) if end > start_arr else None
    if start_obj != -1:
        end = text.rfind('}') + 1
        return json.loads(text[start_obj:end]) if end > start_obj else None
    return None

def get_code_embedding(code: str):
    # Fallback to SentenceBERT since CodeBERT is removed
    return sentence_model.encode(code[:1024], convert_to_tensor=False).tolist()

def get_text_embedding(text: str):
    return sentence_model.encode(text, convert_to_tensor=False).tolist()

def calculate_similarity(emb1, emb2):
    import numpy as np
    a, b = np.array(emb1), np.array(emb2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

#===============================================
# STEP 5: FastAPI Server
#===============================================
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="FAB Dual-Brain Cloud Node")

class GenerateRequest(BaseModel):
    prompt: str
    system_prompt: str = ""
    max_tokens: int = 2048
    temperature: float = 0.3

class CodeAnalysisRequest(BaseModel):
    code: str
    language: str

class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str = ""

@app.get("/")
def root():
    return {"status": "online", "model": LLM_ID, "features": ["llm", "codebert", "sentence-bert"]}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/generate")
def generate_endpoint(req: GenerateRequest):
    start = time.time()
    res = generate_text(req.prompt, req.system_prompt, req.max_tokens, req.temperature)
    return {"result": res, "time_ms": round((time.time() - start)*1000)}

@app.post("/generate-json")
def generate_json_endpoint(req: GenerateRequest):
    start = time.time()
    prompt = req.prompt + "\n\nIMPORTANT: Return ONLY valid JSON."
    res = generate_text(prompt, req.system_prompt, req.max_tokens, 0.2)
    parsed = extract_json(res)
    return {"result": res, "parsed": parsed, "parse_error": parsed is None, "time_ms": round((time.time() - start)*1000)}

@app.post("/evaluate-answer")
def evaluate_answer(req: GenerateRequest):
    # Specialized endpoint for interview scoring
    start = time.time()
    prompt = req.prompt + "\n\nProvide scores as JSON."
    res = generate_text(prompt, "You are a strict technical interviewer.", 1024, 0.2)
    parsed = extract_json(res)
    return {"result": res, "parsed": parsed, "time_ms": round((time.time() - start)*1000)}

@app.post("/analyze-code")
def analyze_code(req: CodeAnalysisRequest):
    # Deep code analysis using hybrid CodeBERT + LLM
    start = time.time()
    
    # 1. Pattern recognition via CodeBERT (Embedding)
    emb = get_code_embedding(req.code)
    
    # 2. Reasoning via LLM
    analysis = generate_text(prompt, "You are a senior staff engineer.", 1024, 0.2)
    
    return {
        "analysis": analysis,
        "embedding_preview": emb[:5],
        "time_ms": round((time.time() - start)*1000)
    }

@app.post("/analyze-project")
def analyze_project(req: GenerateRequest):
    # Analyze README/Structure
    start = time.time()
    emb = get_text_embedding(req.prompt[:5000]) # Embed the project summary
    analysis = generate_text(req.prompt, "Analyze this GitHub project.", 2048, 0.2)
    parsed = extract_json(analysis)
    return {
        "analysis": parsed or analysis,
        "embedding_preview": emb[:5],
        "time_ms": round((time.time() - start)*1000)
    }

#===============================================
# STEP 6: Run Server
#===============================================
print("\n🚀 Starting Cloud Brain Node (Compatible with Colab/Kaggle)...")
public_url = ngrok.connect(8000).public_url

print(f"\n{'='*60}")
print(f"🌐 PUBLIC URL: {public_url}")
print(f"{'='*60}")
print(f"🧠 Model: {LLM_ID}")
print("⚡ Status: Ready for Multi-Cloud Tasking")
print(f"{'='*60}\n")

import uvicorn
config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
server = uvicorn.Server(config)
import asyncio
asyncio.get_event_loop().run_until_complete(server.serve())
