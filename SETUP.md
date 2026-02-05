# SETUP.md - Cloud GPU Brain Setup Guide

## Overview
This guide helps you set up a **FREE GPU-powered AI Brain** on Google Colab to analyze resumes.

---

## Prerequisites
- Google Account
- Ngrok Account (free): https://ngrok.com/

---

## Step 1: Get Your Ngrok Token

1. Go to https://dashboard.ngrok.com/signup
2. Sign up (free)
3. Go to "Your Authtoken" section
4. Copy your token (looks like: `2abc123def456...`)

---

## Step 2: Run the Colab Script

1. Go to https://colab.research.google.com
2. Create a new notebook
3. Copy and paste the following code into a cell:

```python
# CYNO AGENTIC BRAIN (v7.0 - Qwen Edition)
# Run in Google Colab

!pip install -q fastapi uvicorn pydantic transformers torch accelerate bitsandbytes pyngrok nest-asyncio

# ENTER YOUR NGROK TOKEN HERE
NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE"  # <-- REPLACE THIS

import nest_asyncio
from pyngrok import ngrok, conf
nest_asyncio.apply()
conf.get_default().auth_token = NGROK_TOKEN
ngrok.kill()

from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch, uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

model_id = "Qwen/Qwen2.5-1.5B-Instruct"
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16)

print("⏳ Loading model... (this takes 2-3 minutes)")
tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map="auto", trust_remote_code=True)
print("✅ Model loaded!")

app = FastAPI()

class GenReq(BaseModel):
    prompt: str

@app.post("/generate")
def generate(req: GenReq):
    inputs = tokenizer([req.prompt], return_tensors="pt").to(model.device)
    out = model.generate(**inputs, max_new_tokens=2048, temperature=0.3)
    return {"result": tokenizer.batch_decode(out, skip_special_tokens=True)[0]}

@app.get("/health")
def health():
    return {"status": "ok", "model": model_id}

public_url = ngrok.connect(8000).public_url
print("=" * 60)
print(f"🌐 YOUR CLOUD BRAIN URL: {public_url}")
print("=" * 60)
print("Copy this URL and paste it into the FAB run.py when prompted.")

uvicorn.run(app, port=8000)
```

4. Replace `YOUR_NGROK_TOKEN_HERE` with your actual token
5. Click **Runtime > Run all** (or Ctrl+F9)
6. Wait for the model to load (~2-3 minutes)
7. Copy the URL that appears (e.g., `https://xxxx.ngrok-free.app`)

---

## Step 3: Use the URL in FAB

1. Run `python run.py`
2. Choose option `2` (Cloud)
3. Paste your URL when prompted
4. Start analyzing resumes!

---

## Troubleshooting

### "Ngrok tunnel failed"
- Make sure your token is correct
- You may have reached the free tier limit (restart Colab runtime)

### "Model loading failed"
- Check that you're using a GPU runtime: Runtime > Change runtime type > GPU

### "Connection refused"
- Make sure the Colab cell is still running
- Colab sessions timeout after ~30 mins of inactivity

---

## Tips
- Keep the Colab tab open while using FAB
- The free tier of Colab gives ~4 hours of GPU time per day
- For persistent access, consider Colab Pro or self-hosting
