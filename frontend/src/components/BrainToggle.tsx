import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Cloud, Laptop, Server, Save, CheckCircle } from 'lucide-react';

type BrainType = 'local' | 'remote' | 'cloud';

type BrainToggleProps = {
    isModal?: boolean;
    onClose?: () => void;
};

export const BrainToggle: React.FC<BrainToggleProps> = ({ isModal = false, onClose }) => {
    const [brainType, setBrainType] = useState<BrainType>('local');
    const [remoteUrl, setRemoteUrl] = useState('');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load initial config
        axios.get('http://localhost:3000/config/brain').then(res => {
            setBrainType(res.data.brainType || 'local');
            if (res.data.remoteUrl) setRemoteUrl(res.data.remoteUrl);
        }).catch(console.error);
    }, []);

    const colabScript = `# CYNO AGENTIC BRAIN (v7.0 - Qwen Edition)
# Run in Google Colab

!pip install -q fastapi uvicorn pydantic transformers torch accelerate bitsandbytes pyngrok nest-asyncio pdf2image pytesseract
!apt-get install -q -y tesseract-ocr poppler-utils

# ENTER YOUR NGROK TOKEN HERE
NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE"

import nest_asyncio
from pyngrok import ngrok, conf
nest_asyncio.apply()
conf.get_default().auth_token = NGROK_TOKEN
ngrok.kill()

from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch, json, uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

model_id = "Qwen/Qwen2.5-1.5B-Instruct"
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16)

tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map="auto", trust_remote_code=True)

app = FastAPI()
class GenReq(BaseModel): prompt: str
@app.post("/generate")
def generate(req: GenReq):
    inputs = tokenizer([req.prompt], return_tensors="pt").to(model.device)
    out = model.generate(**inputs, max_new_tokens=2048, temperature=0.3)
    return {"result": tokenizer.batch_decode(out, skip_special_tokens=True)[0]}

public_url = ngrok.connect(8000).public_url
print(f"URL: {public_url}")
uvicorn.run(app, port=8000)`;

    const handleSave = async () => {
        setLoading(true);
        setStatus('Saving...');
        try {
            await axios.post('http://localhost:3000/config/brain', {
                brainType,
                remoteUrl: brainType === 'remote' ? remoteUrl : undefined
            });
            setStatus('Config Saved & Brain Connected!');
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error(error);
            setStatus('Error saving config');
        } finally {
            setLoading(false);
        }
    };

    const containerClass = isModal
        ? "bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        : "bg-slate-900 text-white p-6 rounded-xl shadow-2xl border border-slate-700 max-w-2xl mx-auto my-8";

    return (
        <div className={containerClass}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Brain className="w-8 h-8 text-blue-400" />
                    <h2 className="text-2xl font-bold">Brain Configuration</h2>
                </div>
                {isModal && onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => setBrainType('local')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${brainType === 'local'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-700 hover:border-slate-500 text-slate-400'
                        }`}
                >
                    <Laptop className="w-6 h-6" />
                    <span className="font-bold">Local</span>
                    <span className="text-xs opacity-70">Ollama (Gemma 2)</span>
                </button>

                <button
                    onClick={() => setBrainType('remote')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${brainType === 'remote'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-slate-700 hover:border-slate-500 text-slate-400'
                        }`}
                >
                    <Server className="w-6 h-6" />
                    <span className="font-bold">Remote</span>
                    <span className="text-xs opacity-70">Google Colab</span>
                </button>

                <button
                    onClick={() => setBrainType('cloud')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${brainType === 'cloud'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-slate-700 hover:border-slate-500 text-slate-400'
                        }`}
                >
                    <Cloud className="w-6 h-6" />
                    <span className="font-bold">Cloud API</span>
                    <span className="text-xs opacity-70">OpenAI / Gemini</span>
                </button>
            </div>

            {brainType === 'remote' && (
                <div className="mb-6 space-y-4">
                    <div className="p-4 bg-slate-800 rounded-lg border border-purple-500/30">
                        <h3 className="font-bold text-purple-300 mb-2">1. Setup Remote Brain</h3>
                        <p className="text-sm text-slate-400 mb-2">Copy this script to Google Colab to start your GPU Server.</p>
                        <div className="relative">
                            <pre className="bg-black p-3 rounded text-xs text-green-400 overflow-x-auto h-32 scrollbar-thin">
                                {colabScript}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(colabScript)}
                                className="absolute top-2 right-2 bg-purple-600 hover:bg-purple-500 text-xs px-2 py-1 rounded text-white"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-800 rounded-lg animate-fade-in">
                        <label className="block text-sm font-medium mb-2 text-purple-300">
                            2. Connect URL
                        </label>
                        <input
                            type="text"
                            value={remoteUrl}
                            onChange={(e) => setRemoteUrl(e.target.value)}
                            placeholder="https://xxxx.ngrok-free.app"
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {brainType === 'cloud' && (
                <div className="mb-6 p-4 bg-slate-800 rounded-lg animate-fade-in">
                    <label className="block text-sm font-medium mb-2 text-green-300">
                        API Key (OpenAI / Gemini)
                    </label>
                    <input
                        type="password"
                        placeholder="sk-..."
                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-2">
                        Enter your API key safely. It will be stored locally.
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-3">
                {isModal && onClose && (
                    <button onClick={onClose} className="px-6 py-2 rounded-full font-bold text-slate-400 hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                )}
                <button
                    onClick={() => {
                        handleSave();
                        if (isModal && onClose) setTimeout(onClose, 1000);
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? 'Saving...' : (
                        <>
                            <Save className="w-4 h-4" /> Save Config
                        </>
                    )}
                </button>
            </div>

            {status && (
                <div className="mt-4 flex items-center gap-2 text-green-400 text-sm justify-center">
                    <CheckCircle className="w-4 h-4" />
                    {status}
                </div>
            )}
        </div>
    );
};
