import React, { useState, useEffect, useRef } from 'react';
import { AppService } from '../api/endpoints';
import { motion } from 'framer-motion';
import { Send, RefreshCw } from 'lucide-react';

interface BrainWaveProps {
    isActive: boolean;
}

interface Message {
    role: 'ai' | 'user';
    content: string;
}

const Interview: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [ragStatus, setRagStatus] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const username = localStorage.getItem('fab_username') || 'user';

    useEffect(() => {
        startInterviewSession();
    }, []);

    const startInterviewSession = async () => {
        setIsThinking(true);
        try {
            // Check if we have an active session? For now, always start new or maybe check status
            // Simplification: Start new session on mount for this "Lab" view
            const data = await AppService.startInterview(username, { skills: [], projects: [] });
            setSessionId(data.sessionId);
            setMessages([{ role: 'ai', content: data.firstQuestion }]);
            setRagStatus(['Session Initialized', `Topic: ${data.firstQuestion.substring(0, 20)}...`]);
        } catch (e) {
            setMessages([{ role: 'ai', content: "Connection Error: Failed to reach the Neural Core." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !sessionId) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setIsThinking(true);

        try {
            const data = await AppService.submitAnswer(sessionId, userMsg);

            if (data.done) {
                setMessages(prev => [...prev, { role: 'ai', content: `Interview Complete. Final Score: ${data.satisfaction}/100.` }]);
            } else if (data.nextQuestion) {
                setMessages(prev => [...prev, { role: 'ai', content: data.nextQuestion.text }]);
            }
            // Update HUD
            setRagStatus(prev => [`Score Updated: ${data.satisfaction}`, ...prev.slice(0, 2)]);

        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', content: "Error processing response. Please try again." }]);
        } finally {
            setIsThinking(false);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="h-[calc(100vh-6rem)] flex gap-6">
            {/* LEFT PANE: AI Persona & Chat */}
            <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden relative">
                {/* AI Visualization Header */}
                <div className="h-32 bg-gradient-to-b from-teal-900/10 to-transparent flex items-center justify-center border-b border-white/5 relative">
                    <div className={`w-24 h-24 rounded-full border-2 border-neon-teal/30 flex items-center justify-center ${isThinking ? 'animate-pulse' : ''}`}>
                        <div className="w-16 h-16 rounded-full bg-neon-teal/10 blur-xl absolute"></div>
                        <BrainWave isActive={isThinking} />
                    </div>
                    <div className="absolute bottom-2 right-4 text-xs font-mono text-neon-teal/50">
                        MODEL: QWEN_2.5_72B
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] p-4 rounded-xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-neon-teal/10 text-neon-teal border border-neon-teal/20'
                                : 'bg-white/5 text-gray-200 border border-white/5'
                                }`}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    {isThinking && (
                        <div className="flex items-center gap-2 p-4 text-xs font-mono text-gray-500 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> ANALYZING_INPUT...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-obsidian-900/80 border-t border-white/5 backdrop-blur">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type your answer..."
                            className="flex-1 bg-obsidian-950 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-teal/50 transition-colors font-mono text-sm"
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-neon-teal text-obsidian-900 px-4 py-2 rounded-lg hover:bg-neon-teal/90 transition-colors font-bold flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT PANE: HUD & Context */}
            <div className="w-80 space-y-6">
                {/* Live RAG Log */}
                <div className="glass-panel p-4 rounded-xl h-1/2 flex flex-col">
                    <div className="text-xs font-mono text-gray-500 mb-2 border-b border-white/5 pb-2 flex justify-between">
                        <span>LIVE_CONTEXT_LOG</span>
                        <span className="text-neon-teal">ACTIVE</span>
                    </div>
                    <div className="flex-1 overflow-hidden font-mono text-[10px] space-y-2 text-gray-400">
                        {ragStatus.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="truncate"
                            >
                                {`> ${log}`}
                            </motion.div>
                        ))}
                        <div className="w-2 h-4 bg-neon-teal/50 animate-pulse inline-block align-middle ml-1"></div>
                    </div>
                </div>

                {/* Critiques / Stats */}
                <div className="glass-panel p-4 rounded-xl h-1/2 relative overflow-hidden">
                    <div className="text-xs font-mono text-gray-500 mb-4">REAL_TIME_SATISFACTION</div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold text-white">{ragStatus[0]?.includes('Score') ? ragStatus[0].split(': ')[1] : '50'}</span>
                        <span className="text-sm text-gray-400 mb-1">/ 100</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-neon-amber w-1/2"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BrainWave: React.FC<BrainWaveProps> = ({ isActive }) => (
    <svg viewBox="0 0 100 100" className={`w-12 h-12 text-neon-teal fill-current opacity-80 ${isActive ? 'animate-pulse' : ''}`}>
        <path d="M50 20 Q60 50 50 80 Q40 50 50 20" />
        {/* Simplified placeholder for waveform */}
    </svg>
);

export default Interview;
