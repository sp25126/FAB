import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RAGPanel from './RAGPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { AppService, type InterviewAnswerResponse } from '../../services/api';

interface Message {
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    critique?: { score: number; text: string };
    tags?: string[];
}

const ChatInterface: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sessionId = localStorage.getItem('fab_session_id');

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Initialize Session
    useEffect(() => {
        if (!sessionId) {
            navigate('/dashboard');
            return;
        }

        // Load initial question from navigation state or default
        const firstQ = location.state?.firstQuestion || "Ready to begin?";
        if (messages.length === 0) {
            setMessages([{
                role: 'ai',
                content: firstQ,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    }, [sessionId, navigate, location.state]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return;

        const userMsg: Message = {
            role: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: input,
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const res: InterviewAnswerResponse = await AppService.submitAnswer(sessionId, userMsg.content);

            setIsTyping(false);

            // Add critique if available (feedback)
            const aiMsg: Message = {
                role: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                content: res.nextQuestion ? res.nextQuestion.text : "Interview Complete. Generating report...",
                critique: {
                    score: res.score,
                    text: res.feedback
                },
                tags: res.nextQuestion?.type ? [res.nextQuestion.type] : []
            };

            setMessages(prev => [...prev, aiMsg]);

            if (res.done) {
                setTimeout(() => {
                    alert("Session Finished! Redirecting to report (Dashboard for now)...");
                    navigate('/dashboard'); // TODO: Redirect to report page
                }, 3000);
            }

        } catch (error) {
            console.error("Answer submission failed", error);
            setIsTyping(false);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "System Error: Could not process answer. Please check connection.",
                timestamp: new Date().toLocaleTimeString()
            }]);
        }
    };

    return (
        <section className="flex-1 flex flex-col relative bg-obsidian/60 backdrop-blur-sm h-full overflow-hidden">
            {/* Chat Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scroll-smooth pr-64" id="chat-container">
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                    <span className="text-xs font-mono text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/5">LIVE SESSION</span>
                </div>

                <AnimatePresence mode='popLayout'>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className={`flex gap-3 md:gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            {msg.role === 'ai' ? (
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(13,242,242,0.3)]">
                                    <span className="material-symbols-outlined text-black text-xs md:text-sm">smart_toy</span>
                                </div>
                            ) : (
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cover bg-center border border-white/20 shrink-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB1_sXlln169jfQFQUcUhi5b81sqlZRgPBS6DoNVodDvpnTM9uCuunDtlLjfobYsALtgce26lnEyN2zVa8RsDvAaI99Vxz1NPuMDOo5yAWvgHWkYZDcbXGVME_oIwNYVN4Xhhes_CE88hXUPdL9FDox4db9dxCzFFjIkukB-EBmDDHSWD7myRNn6pxky1zssKO-05_7aa8nO809-5IwwewVmijDHpPJQhDrX2-JXoxO6UWLS6bs9V_UfPf1_dGj6-sKqbzplk1fHw')" }}></div>
                            )}

                            <div className={`flex flex-col gap-1 md:gap-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                                <div className="flex items-baseline gap-2">
                                    <span className={`${msg.role === 'ai' ? 'text-primary' : 'text-white'} text-xs md:text-sm font-bold`}>
                                        {msg.role === 'ai' ? 'AI Interviewer' : 'Candidate'}
                                    </span>
                                    <span className="text-white/30 text-[10px] md:text-xs">{msg.timestamp}</span>
                                </div>

                                <div className={`p-3 md:p-4 rounded-2xl text-sm md:text-base leading-relaxed ${msg.role === 'ai'
                                    ? 'glass-panel rounded-tl-none text-white/90 relative overflow-hidden group shadow-lg'
                                    : 'bg-white/5 backdrop-blur-md border border-white/10 rounded-tr-none text-white/90 shadow'
                                    }`}>
                                    {msg.role === 'ai' && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                    )}
                                    <p>{msg.content}</p>
                                </div>

                                {msg.tags && msg.tags.length > 0 && (
                                    <div className="flex gap-2 mt-1">
                                        {msg.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 rounded text-[10px] border border-white/10 text-white/40 uppercase tracking-wide">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {msg.critique && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mr-14 self-end w-full max-w-lg animate-pulse-slow"
                                    >
                                        <div className="bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary p-3 rounded-r-lg flex gap-3 items-start mt-2">
                                            <span className="material-symbols-outlined text-primary text-lg mt-0.5">analytics</span>
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-primary text-xs font-bold uppercase tracking-wider">Real-time Analysis</span>
                                                    <span className="text-primary text-xs font-mono">Score: {msg.critique.score}</span>
                                                </div>
                                                <p className="text-white/70 text-sm">{msg.critique.text}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Enhanced Thinking Indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex gap-4 max-w-3xl mr-auto"
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(13,242,242,0.2)]">
                            <span className="material-symbols-outlined text-black text-xs md:text-sm animate-pulse">smart_toy</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none border border-white/10">
                            <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                            <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                            <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                            <span className="text-xs text-white/40 ml-1 font-mono tracking-widest uppercase">Thinking</span>
                        </div>
                    </motion.div>
                )}
            </div>

            <RAGPanel />

            {/* Input Area */}
            <div className="p-6 pt-2 z-30 shrink-0 pr-64 border-t border-white/5">
                <div className="glass-panel p-2 rounded-xl flex items-end gap-2 relative shadow-lg">
                    <button className="p-3 hover:bg-white/10 rounded-lg text-white/60 hover:text-primary transition-colors h-[52px] w-[52px] flex items-center justify-center">
                        <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    <div className="flex-1 bg-black/30 rounded-lg border border-white/5 focus-within:border-primary/50 transition-colors flex flex-col min-h-[52px]">
                        <textarea
                            className="bg-transparent border-none text-white text-sm p-3 w-full focus:ring-0 resize-none placeholder-white/30 font-body leading-relaxed outline-none"
                            placeholder="Type your answer or paste code snippet..."
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        ></textarea>
                    </div>
                    <button className="p-3 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors h-[52px] w-[52px] flex items-center justify-center" title="Voice Input">
                        <span className="material-symbols-outlined">mic</span>
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isTyping || !input.trim()}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-obsidian rounded-lg h-[52px] px-6 font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(13,242,242,0.2)] hover:shadow-[0_0_30px_rgba(13,242,242,0.4)] active:scale-95"
                    >
                        <span>Send</span>
                        <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-white/20">AI may produce inaccurate information about people, places, or facts.</p>
                </div>
            </div>
        </section>
    );
};

export default ChatInterface;
