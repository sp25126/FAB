# CYNO AGENTIC BRAIN (v7.0 - Qwen Edition)
# Run this in Google Colab to power your local FAB instance.

#===============================================
# STEP 1: Install Dependencies
#===============================================
print("📦 Installing dependencies (bitsandbytes, accelerate, fastapi, etc.)...")
import os
os.system("pip install -q fastapi uvicorn pydantic transformers torch accelerate bitsandbytes pyngrok nest-asyncio pdf2image pytesseract")
os.system("apt-get install -q -y tesseract-ocr poppler-utils")

#===============================================
# STEP 2: Configure Ngrok
#===============================================
# YOUR TOKEN (Do not share this file publicly)
NGROK_TOKEN = "31yYPXhPRNGBB9mEcNpDp8YOaZK_65SMKRBe8C7UUe1V2wfMx"

import nest_asyncio
from pyngrok import ngrok, conf

nest_asyncio.apply()

print("🔐 Authenticating with ngrok...")
conf.get_default().auth_token = NGROK_TOKEN
ngrok.kill()

#===============================================
# STEP 3: Load Model (Qwen 2.5 - 1.5B)
#===============================================
print("🧠 Loading Qwen 2.5 (1.5B) - Optimized for <2GB VRAM...")

from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
import json
import base64
import time

# Tiny but mighty model
model_id = "Qwen/Qwen2.5-1.5B-Instruct"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

try:
    print(f"⏳ Downloading {model_id}...")
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, 
        quantization_config=bnb_config, 
        device_map="auto", 
        trust_remote_code=True
    )
    print(f"✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Model load failed: {e}")
    raise e

#===============================================
# STEP 4: Helper Functions
#===============================================
def extract_json_from_text(text: str):
    try:
        # Simple heuristic to find JSON blob
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        return {}
    except:
        return {}

#===============================================
# STEP 5: FastAPI Server
#===============================================
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="FAB Qwen Brain")

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 2048
    temperature: float = 0.3

class ParsePDFRequest(BaseModel):
    pdf_base64: str

@app.get("/")
def root():
    return {"status": "online", "model": model_id}

@app.post("/generate")
def generate(req: GenerateRequest):
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": req.prompt}
    ]
    text = tokenizer.apply_chat_template(
        messages, 
        tokenize=False, 
        add_generation_prompt=True
    )
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    generated_ids = model.generate(
        **model_inputs,
        max_new_tokens=req.max_tokens,
        temperature=req.temperature
    )
    
    generated_ids = [
        output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
    ]
    
    response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return {"result": response}

@app.post("/parse_resume")
def parse_resume(req: ParsePDFRequest):
    # For now, we assume the backend sends raw text or we invoke OCR here.
    # To keep it simple for <2GB, let's assume the backend sends extracted TEXT in the prompt usually.
    # But if we receive PDF base64, we'd need OCR.
    # Let's rely on the generate endpoint for logic if the backend handles text extraction.
    return {"error": "Use /generate with extracted text for best performance"}

#===============================================
# STEP 6: Run
#===============================================
print("🚀 Starting Server...")
public_url = ngrok.connect(8000).public_url
print(f"🌐 YOUR PUBLIC URL: {public_url}")
print("Paste this into your local .env as REMOTE_BRAIN_URL")

import uvicorn
config = uvicorn.Config(app, host="0.0.0.0", port=8000)
server = uvicorn.Server(config)
import asyncio
asyncio.get_event_loop().run_until_complete(server.serve())
