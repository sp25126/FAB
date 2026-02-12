# FAB Brain - Colab Server Script
# Copy this entire script into a Google Colab cell and run it.
# It will generate a public URL (ngrok/zrok) that you can paste into the FAB Setup.

!pip install -q pyngrok flask flask-cors google-generativeai

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
import google.generativeai as genai

# --- CONFIGURATION ---
# Get your API key from https://aistudio.google.com/app/apikey
GOOGLE_API_KEY = "31yYPXhPRNGBB9mEcNpDp8YOaZK_65SMKRBe8C7UUe1V2wfMx" 
ngrok.set_auth_token("YOUR_NGROK_TOKEN_HERE") # Optional but recommended

genai.configure(api_key=GOOGLE_API_KEY)

# --- MODEL SETUP ---
model = genai.GenerativeModel('gemini-pro')

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "online", "brain": "Gemini Pro (Colab)"})

@app.route('/interview/chat', methods=['POST'])
def chat():
    # Matches api.ts submitAnswer payload
    data = request.json
    prompt = data.get('prompt', '')
    history = data.get('history', [])
    
    print(f"Received prompt: {prompt}")
    
    # Simple Context
    full_prompt = f"System: You are an expert technical interviewer called FAB. Analyze the candidate's answer. If it's short, ask a follow up. If it's wrong, correct them gently.\n\nUser Answer: {prompt}\n\nFAB response:"
    
    try:
        response = model.generate_content(full_prompt)
        text = response.text
        return jsonify({"response": text})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- RUN SERVER ---
public_url = ngrok.connect(5000).public_url
print(f"🚀 FAB BRAIN IS LIVE! COPY THIS URL: {public_url}")

app.run(port=5000)
