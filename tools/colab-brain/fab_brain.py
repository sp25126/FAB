# FAB CLOUD BRAIN (v13.1 - Cloud Agnostic)
# heavy tasking enabled: Qwen 2.5-1.5B (Fast & Light) + SentenceBERT
# Compatible with Google Colab (T4) and Kaggle (T4/P100)

import os
# Auto-install dependencies if in cloud environments (Colab/Kaggle)
if 'COLAB_GPU' in os.environ or 'KAGGLE_URL_BASE' in os.environ:
    os.system("pip install -q fastapi uvicorn pydantic transformers torch accelerate bitsandbytes pyngrok nest-asyncio sentencepiece sentence-transformers")

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import time
import json
import asyncio
from typing import List, Optional, Dict, Any

from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import nest_asyncio
from pyngrok import ngrok, conf

# Machine Learning Imports
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from sentence_transformers import SentenceTransformer
import torch
#===============================================
# STEP 2: Configure Ngrok
#===============================================
# ⚠️ REPLACE THIS WITH YOUR TOKEN ⚠️
NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE" 

nest_asyncio.apply()

if NGROK_TOKEN != "YOUR_NGROK_TOKEN_HERE":
    print("🔐 Authenticating with ngrok...")
    conf.get_default().auth_token = NGROK_TOKEN
    ngrok.kill()

#===============================================
# STEP 3: Load Heavy Models (Targeting ~8GB VRAM)
#===============================================

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

# 1. Primary LLM: Qwen 2.5-1.5B-Instruct
LLM_ID = "Qwen/Qwen2.5-1.5B-Instruct"
print(f"🧠 Loading Main LLM: {LLM_ID}...")

# Load Tokenizer & Model
try:
    tokenizer = AutoTokenizer.from_pretrained(LLM_ID, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        LLM_ID, 
        quantization_config=bnb_config,
        device_map="auto", 
        trust_remote_code=True,
        torch_dtype=torch.float16
    )
    print("✅ Qwen 1.5B Loaded!")
except Exception as e:
    print(f"❌ Failed to load LLM: {e}")
    # Fallback or exit logic here

# 3. Semantic Search: Sentence-BERT
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
    """
    Generates text using the loaded LLM.

    Args:
        prompt (str): The user input prompt.
        system_prompt (str): The system context.
        max_tokens (int): Maximum generation length.
        temperature (float): Randomness of output.

    Returns:
        str: Generated text response.
    """
    messages = [
        {"role": "system", "content": system_prompt or "You are a helpful AI assistant."},
        {"role": "user", "content": prompt}
    ]
    
    # 1. Truncate long contexts to prevent OOM
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    if len(text) > 8000: # Heuristic for 4-bit 1.5B model on T4
        text = text[-8000:] 
        
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)
    
    # 2. Memory Optimizations
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        
    with torch.inference_mode():
        generated_ids = model.generate(
            **model_inputs, 
            max_new_tokens=max_tokens, 
            temperature=temperature,
            do_sample=True if temperature > 0 else False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id
        )
    
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):]
    return tokenizer.decode(output_ids, skip_special_tokens=True)

def extract_json(text: str) -> Optional[Any]:
    """
    Extracts and parses JSON from a markdown code block or raw string.

    Args:
        text (str): The string containing JSON.

    Returns:
        Optional[Any]: Parsed JSON object or None if failed.
    """
    import re
    # Try finding JSON block
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if json_match:
        text = json_match.group(1)
    
    # Try finding raw structure
    start_arr, start_obj = text.find('['), text.find('{')
    
    try:
        if start_arr != -1 and (start_obj == -1 or start_arr < start_obj):
            end = text.rfind(']') + 1
            if end > start_arr:
                return json.loads(text[start_arr:end])
        if start_obj != -1:
            end = text.rfind('}') + 1
            if end > start_obj:
                return json.loads(text[start_obj:end])
    except json.JSONDecodeError:
        return None
        
    return None

def get_code_embedding(code: str) -> List[float]:
    """Generates embedding for code snippet using SentenceBERT."""
    return sentence_model.encode(code[:1024], convert_to_tensor=False).tolist()

def get_text_embedding(text: str) -> List[float]:
    """Generates embedding for text using SentenceBERT."""
    return sentence_model.encode(text, convert_to_tensor=False).tolist()


#===============================================
# STEP 5: FastAPI Server
#===============================================

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
    return {"status": "online", "model": LLM_ID, "features": ["llm", "sentence-bert"]}

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
    return {
        "result": res, 
        "parsed": parsed, 
        "parse_error": parsed is None, 
        "time_ms": round((time.time() - start)*1000)
    }

@app.post("/evaluate-answer")
def evaluate_answer(req: GenerateRequest):
    """Specialized endpoint for interview scoring."""
    start = time.time()
    prompt = req.prompt + "\n\nProvide scores as JSON."
    res = generate_text(prompt, "You are a strict technical interviewer.", 1024, 0.2)
    parsed = extract_json(res)
    return {"result": res, "parsed": parsed, "time_ms": round((time.time() - start)*1000)}

@app.post("/analyze-code")
def analyze_code(req: CodeAnalysisRequest):
    """Deep code analysis using hybrid embeddings + LLM reasoning."""
    start = time.time()
    emb = get_code_embedding(req.code)
    
    analysis = generate_text(f"Analyze this code:\n{req.code}", "You are a senior staff engineer.", 1024, 0.2)
    
    return {
        "analysis": analysis,
        "embedding_preview": emb[:5],
        "time_ms": round((time.time() - start)*1000)
    }

@app.post("/analyze-resume")
def analyze_resume(req: ResumeAnalysisRequest):
    """Specialized Resume Parsing endpoint."""
    start = time.time()
    
    system_prompt = """You are an expert HR Data Extractor. 
    Extract details from the resume into this JSON structure:
    {
        "languages": ["python", "java"],
        "frameworks": ["react"],
        "tools": ["git"],
        "concepts": ["agile"],
        "summary": "Professional summary...",
        "experience": [{"company": "Name", "role": "Title", "duration": "Dates", "highlights": ["..."]}],
        "projects": [{"name": "Title", "tech": ["stack"], "description": "..."}]
    }
    Return ONLY valid JSON. If data is missing, use empty arrays."""
    
    prompt = f"RESUME TEXT:\n{req.resume_text[:4000]}\n\nExtract JSON:"
    res = generate_text(prompt, system_prompt, 2048, 0.2)
    parsed = extract_json(res)
    
    return {
        "analysis": parsed,
        "raw": res,
        "time_ms": round((time.time() - start)*1000)
    }

class QuestionRequest(BaseModel):
    skills: List[str]
    projects: List[dict] = []
    count: int = 3

@app.post("/generate-questions")
def generate_questions(req: QuestionRequest):
    """Generates context-aware technical interview questions."""
    start = time.time()
    
    skill_str = ", ".join(req.skills[:5])
    project_CTX = ""
    if req.projects:
        project_CTX = f"Candidate has built: {', '.join([p.get('name', 'Project') for p in req.projects])}."

    system_prompt = "You are a Technical Interviewer. Generate diverse, challenging interview questions."
    prompt = f"""Generate {req.count} technical interview questions based on:
    Skills: {skill_str}
    {project_CTX}
    
    Return a JSON object with a key 'questions' containing a list of objects:
    {{
        "questions": [
            {{ "text": "Question text?", "type": "TECHNICAL", "difficulty": "MEDIUM" }}
        ]
    }}
    """

    res = generate_text(prompt, system_prompt, 1024, 0.4)
    parsed = extract_json(res)
    
    return {
        "questions": parsed.get("questions", []) if parsed else [],
        "raw": res,
        "time_ms": round((time.time() - start)*1000)
    }

#===============================================
# STEP 6: Run Server
#===============================================
if __name__ == "__main__":
    print("\n🚀 Starting Cloud Brain Node (Compatible with Colab/Kaggle)...")
    
    # Only connect ngrok if token is set
    if NGROK_TOKEN != "YOUR_NGROK_TOKEN_HERE":
        public_url = ngrok.connect(8000).public_url
        print(f"\n{'='*60}")
        print(f"🌐 PUBLIC URL: {public_url}")
        print(f"{'='*60}")
    else:
        print("⚠️  Ngrok not configured. Running locally on port 8000.")

    print(f"🧠 Model: {LLM_ID}")
    print("⚡ Status: Ready for Multi-Cloud Tasking")
    print(f"{'='*60}\n")

    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
