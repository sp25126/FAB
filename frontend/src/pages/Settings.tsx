import React, { useState, useEffect } from 'react';
import { AppService } from '../api/endpoints';
import type { BrainConfigResponse } from '../api/endpoints';
import { Trash2, Monitor, Cloud, Copy, Check, ChevronDown, ChevronUp, Terminal, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLAB_SCRIPT = `# FAB CLOUD BRAIN (v14.1 - Sync Fix)
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
    print(f"\\n🎮 GPU: {torch.cuda.get_device_name(0)}")
    print(f"💾 VRAM Used: {gpu_mem:.2f} GB / {gpu_total:.2f} GB")


#===============================================
# STEP 4: Core Functions
#===============================================

def generate_text(prompt: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.3) -> str:
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
    import re
    # Try finding JSON block
    json_match = re.search(r'\\\`\\\`\\\`(?:json)?\\s*([\\s\\S]*?)\\\`\\\`\\\`', text)
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
    return sentence_model.encode(code[:1024], convert_to_tensor=False).tolist()

def get_text_embedding(text: str) -> List[float]:
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
    prompt = req.prompt + "\\n\\nIMPORTANT: Return ONLY valid JSON."
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
    start = time.time()
    prompt = req.prompt + "\\n\\nProvide scores as JSON."
    res = generate_text(prompt, "You are a strict technical interviewer.", 1024, 0.2)
    parsed = extract_json(res)
    return {"result": res, "parsed": parsed, "time_ms": round((time.time() - start)*1000)}

@app.post("/analyze-code")
def analyze_code(req: CodeAnalysisRequest):
    start = time.time()
    emb = get_code_embedding(req.code)
    analysis = generate_text(f"Analyze this code:\\n{req.code}", "You are a senior staff engineer.", 1024, 0.2)
    return {
        "analysis": analysis,
        "embedding_preview": emb[:5],
        "time_ms": round((time.time() - start)*1000)
    }

@app.post("/analyze-resume")
def analyze_resume(req: ResumeAnalysisRequest):
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
    
    prompt = f"RESUME TEXT:\\n{req.resume_text[:4000]}\\n\\nExtract JSON:"
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
    print("\\n🚀 Starting Cloud Brain Node (Compatible with Colab/Kaggle)...")
    if NGROK_TOKEN != "YOUR_NGROK_TOKEN_HERE":
        public_url = ngrok.connect(8000).public_url
        print(f"\\n{'='*60}")
        print(f"🌐 PUBLIC URL: {public_url}")
        print(f"{'='*60}")
    else:
        print("⚠️  Ngrok not configured. Running locally on port 8000.")

    print(f"🧠 Model: {LLM_ID}")
    print("⚡ Status: Ready for Multi-Cloud Tasking")
    print(f"{'='*60}\\n")

    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
`;

export const Settings: React.FC = () => {
    const [config, setConfig] = useState<BrainConfigResponse>({
        brainType: 'local',
        status: 'configured'
    });
    const [remoteUrl, setRemoteUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showScript, setShowScript] = useState(false);

    useEffect(() => {
        AppService.getBrainConfig().then(c => {
            setConfig(c);
            if (c.remoteUrl) setRemoteUrl(c.remoteUrl);
        });
    }, []);

    const handleSave = async (type: 'local' | 'remote') => {
        setLoading(true);
        try {
            await AppService.updateBrainConfig(type, type === 'remote' ? remoteUrl : '');
            const newConfig = await AppService.getBrainConfig();
            setConfig(newConfig);
            alert(`Neural link established via ${type === 'local' ? 'Local Core' : 'Remote Uplink'} !`);
        } catch (error) {
            console.error("Failed to update config:", error);
            alert("Failed to update configuration. The neural link could not be established.");
        } finally {
            setLoading(false);
            // Full reload removed to prevent flickering and maintain connection stability
        }
    };

    const handleCopyScale = () => {
        navigator.clipboard.writeText(COLAB_SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative min-h-screen pb-20 overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] rounded-full bg-neon-teal/5 blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-10 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2"
                >
                    <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                        System Configuration
                    </h1>
                    <p className="text-white/40 text-sm">Manage neural link protocols and system integrity.</p>
                </motion.div>

                {/* Neural Link Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-8 rounded-3xl relative overflow-hidden group shadow-2xl"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                        <Cloud size={150} />
                    </div>

                    <h2 className="font-bold text-xl mb-6 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neon-cyan/10 text-neon-cyan">
                            <Monitor size={20} />
                        </div>
                        Brain Integration Protocol
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button
                            onClick={() => handleSave('local')}
                            className={`group relative p-6 border rounded-2xl flex flex-col items-center gap-4 transition-all duration-300 ${config.brainType === 'local'
                                ? 'bg-neon-teal/10 border-neon-teal shadow-[0_0_30px_rgba(20,184,166,0.15)] ring-1 ring-neon-teal/50'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                } `}
                        >
                            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${config.brainType === 'local' ? 'bg-neon-teal/20 text-neon-teal' : 'bg-white/10 text-white/40'} `}>
                                <Terminal size={28} />
                            </div>
                            <div className="text-center space-y-1">
                                <span className={`block font-bold text-base tracking-wide ${config.brainType === 'local' ? 'text-neon-teal' : 'text-white/60'} `}>LOCAL CORE</span>
                                <span className="text-xs text-white/40 block">Ollama (Development)</span>
                            </div>
                            {config.brainType === 'local' && (
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-neon-teal rounded-full animate-ping" />
                                    <div className="w-1.5 h-1.5 bg-neon-teal rounded-full" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => handleSave('remote')}
                            className={`group relative p-6 border rounded-2xl flex flex-col items-center gap-4 transition-all duration-300 ${config.brainType === 'remote'
                                ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_30px_rgba(0,242,234,0.15)] ring-1 ring-neon-cyan/50'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                } `}
                        >
                            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${config.brainType === 'remote' ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-white/10 text-white/40'} `}>
                                <Cloud size={28} />
                            </div>
                            <div className="text-center space-y-1">
                                <span className={`block font-bold text-base tracking-wide ${config.brainType === 'remote' ? 'text-neon-cyan' : 'text-white/60'} `}>REMOTE UPLINK</span>
                                <span className="text-xs text-white/40 block">Colab / Kaggle T4</span>
                            </div>
                            {config.brainType === 'remote' && (
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full animate-ping" />
                                    <div className="w-1.5 h-1.5 bg-neon-cyan rounded-full" />
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Remote URL Configuration */}
                    <AnimatePresence>
                        {config.brainType === 'remote' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-8 pt-8 border-t border-white/10"
                            >
                                <label className="text-xs font-bold text-white/40 uppercase mb-3 block tracking-[0.2em] ml-1">Secure Uplink Details</label>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-white/20 text-xs font-mono">https://</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={remoteUrl.replace('https://', '')}
                                            onChange={(e) => setRemoteUrl(`https://${e.target.value.replace('https://', '')}`)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-16 pr-4 text-white font-mono text-sm focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 outline-none transition-all placeholder-white/20 group-hover:border-white/20"
                                            placeholder="xxxx-xx-xx.ngrok-free.app"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSave('remote')}
                                        disabled={loading}
                                        className="bg-neon-cyan hover:bg-neon-cyan/90 text-obsidian-950 font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(0,242,234,0.2)] hover:shadow-[0_0_30px_rgba(0,242,234,0.4)] hover:-translate-y-0.5 disabled:opacity-50"
                                    >
                                        {loading ? 'LINKING...' : 'ESTABLISH LINK'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Cloud Brain Protocol - Deployment Guide */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-8 rounded-3xl border border-neon-purple/20 shadow-[0_0_30px_rgba(147,51,234,0.05)]"
                >
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="font-bold text-xl flex items-center gap-3 text-white mb-2">
                                <div className="p-2 rounded-lg bg-neon-purple/10 text-neon-purple">
                                    <Cloud size={20} />
                                </div>
                                Cloud Brain Deployment
                            </h2>
                            <p className="text-sm text-white/40">Deploy high-performance visual cortex on Google Colab to offload heavy processing.</p>
                        </div>
                        <a
                            href="https://colab.research.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-colors text-neon-cyan group"
                        >
                            LAUNCH COLAB <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </div>

                    <div className="space-y-6">
                        {/* Setup Steps */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { step: '01', title: 'Initialize Runtime', desc: 'Open Colab and set Runtime type to T4 GPU.' },
                                { step: '02', title: 'Inject Payload', desc: 'Copy the script payload below and paste into the first cell.' },
                                { step: '03', title: 'Authenticate & Run', desc: 'Add your Ngrok Token to the script and execute.' }
                            ].map((s) => (
                                <div key={s.step} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors group">
                                    <div className="text-neon-purple font-display font-bold text-2xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">{s.step}</div>
                                    <div className="text-sm text-white/90 font-bold mb-1">{s.title}</div>
                                    <div className="text-xs text-white/40 leading-relaxed">{s.desc}</div>
                                </div>
                            ))}
                        </div>

                        {/* Code Block & Copy Action */}
                        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-inner relative group">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                                    </div>
                                    <span className="text-xs font-mono text-white/30 ml-2">fab_brain.py</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowScript(!showScript)}
                                        className="p-1.5 text-white/30 hover:text-white transition-colors"
                                    >
                                        {showScript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <button
                                        onClick={handleCopyScale}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all border ${copied
                                                ? 'bg-green-500/20 text-green-500 border-green-500/30'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                        {copied ? 'COPIED TO CLIPBOARD' : 'COPY SCRIPT'}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showScript && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <textarea
                                            readOnly
                                            value={COLAB_SCRIPT}
                                            className="w-full h-96 bg-transparent text-xs font-mono text-white/50 p-6 outline-none resize-none leading-relaxed"
                                            spellCheck={false}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!showScript && (
                                <div className="p-12 text-center cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setShowScript(true)}>
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/30">
                                        <Terminal size={20} />
                                    </div>
                                    <span className="text-xs text-white/40 font-mono">Click to expand source payload (300+ lines)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Danger Zone */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel p-8 rounded-3xl border border-red-500/10 hover:border-red-500/30 transition-colors"
                >
                    <h2 className="font-bold text-lg text-red-500 flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <Trash2 size={20} />
                        </div>
                        Danger Zone
                    </h2>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div>
                            <h4 className="font-bold text-sm text-white/90">System Factory Reset</h4>
                            <p className="text-xs text-white/40 mt-1 max-w-md">Purges all local caches, session history, and stored analysis data. This action cannot be undone.</p>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure? This will wipe all local data.")) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all uppercase tracking-wider hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        >
                            Execute Wipe
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
