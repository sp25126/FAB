import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppService } from '../api/endpoints';
import type { InterviewAnswerResponse } from '../api/endpoints';
import { InterviewQuestionCard } from '../components/InterviewQuestionCard';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { VibePulseMeter } from '../components/VibePulseMeter';
import { Send, Loader2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useScrollGlow } from '../hooks/useScrollGlow';

export const InterviewLive: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams<{ sessionId?: string }>();

    // Priority: URL Param -> localStorage -> fallback
    const sessionId = params.sessionId || localStorage.getItem('fab_session_id');

    const [question, setQuestion] = useState(location.state?.firstQuestion || "");
    const [answer, setAnswer] = useState(() => {
        // Hydrate draft from localStorage
        const draftKey = `fab_draft_${sessionId}`;
        return localStorage.getItem(draftKey) || '';
    });
    const [loading, setLoading] = useState(false);
    const [lastResponse, setLastResponse] = useState<InterviewAnswerResponse | null>(null);

    // Save draft to localStorage as user types
    useEffect(() => {
        if (sessionId && answer) {
            localStorage.setItem(`fab_draft_${sessionId}`, answer);
        }
    }, [sessionId, answer]);

    useEffect(() => {
        // If we have a sessionId but no current question, or we came from a deep link
        if (sessionId && (!question || params.sessionId)) {
            setLoading(true);
            AppService.getSessionStatus(sessionId)
                .then(data => {
                    // Sync localStorage if we recovered from URL
                    if (params.sessionId) localStorage.setItem('fab_session_id', sessionId);

                    if (data.currentQuestion) {
                        setQuestion(data.currentQuestion.text);
                        // Restore partial score state so side rail isn't empty
                        if (data.lastFeedback) {
                            setLastResponse({
                                score: data.satisfaction,
                                feedback: data.lastFeedback,
                                satisfaction: data.satisfaction,
                                done: data.done,
                                nextQuestion: data.currentQuestion
                            });
                        }
                    } else if (data.done) {
                        navigate('/interview/summary');
                    } else {
                        setQuestion("Preparing your next interrogation challenge...");
                    }
                })
                .catch(err => {
                    console.error("Session recovery failed:", err);
                    if (err.response?.status === 404) {
                        alert("Your interview session has expired or was not found. Protocol dictates a restart.");
                        localStorage.removeItem('fab_session_id');
                        localStorage.removeItem(`fab_draft_${sessionId}`);
                        navigate('/interview/setup');
                    } else {
                        setQuestion("Signal lost. Attempting to re-establish neural link...");
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [sessionId, params.sessionId, navigate]);

    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    useScrollGlow(inputRef);

    const handleSend = async () => {
        if (!answer.trim() || !sessionId) return;
        setLoading(true);

        try {
            const res = await AppService.submitAnswer(sessionId, answer);
            setLastResponse(res);
            setAnswer('');
            localStorage.removeItem(`fab_draft_${sessionId}`);

            if (res.done) {
                localStorage.removeItem('fab_session_id');
                setTimeout(() => navigate('/interview/summary'), 2000);
            } else if (res.nextQuestion) {
                setQuestion(res.nextQuestion.text);
            }
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 404) {
                alert("Session terminated or invalid.");
                localStorage.removeItem('fab_session_id');
                navigate('/interview/setup');
            } else {
                alert("Brain synchronization failed. Retrying...");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-100px)] overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-neon-teal/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/5 blur-[100px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full relative z-10">

                {/* Main Area: Question & Answer (8 Cols) */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    <AnimatePresence mode="wait">
                        <InterviewQuestionCard
                            key={question}
                            text={question}
                            difficulty={lastResponse?.nextQuestion?.difficulty || "MEDIUM"}
                            type={lastResponse?.nextQuestion?.type || "TECHNICAL"}
                            interviewerIdentity={lastResponse?.nextQuestion?.interviewerIdentity}
                            context={lastResponse?.nextQuestion?.context}
                        />
                    </AnimatePresence>

                    {/* Enhanced Input Area */}
                    <div className="glass-panel rounded-2xl flex-1 flex flex-col relative focus-within:ring-1 ring-neon-teal/50 transition-all overflow-hidden group shadow-lg">

                        {/* Status Bar */}
                        <div className="h-8 bg-black/20 border-b border-white/5 flex items-center justify-between px-4 text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${answer.length > 0 ? 'bg-neon-teal animate-pulse' : 'bg-white/20'}`} />
                                {answer.length > 0 ? 'INPUT DETECTED' : 'WAITING FOR INPUT'}
                            </div>
                            <div className="flex items-center gap-3">
                                <span>MARKDOWN SUPPORTED</span>
                                <span className="text-white/10">|</span>
                                <span>UTF-8 ENCODED</span>
                            </div>
                        </div>

                        <textarea
                            ref={inputRef}
                            className="flex-1 bg-transparent border-none outline-none text-white p-6 resize-none font-sans text-lg leading-relaxed placeholder-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent focus:bg-white/[0.02] transition-colors"
                            placeholder="Type your answer here... Be direct. Use code blocks for technical explanations."
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && e.ctrlKey) handleSend();
                            }}
                            disabled={loading}
                        />

                        {/* Action Footer */}
                        <div className="flex justify-between items-center p-4 border-t border-white/5 bg-black/10 backdrop-blur-sm">
                            <div className="flex items-center gap-4 text-xs">
                                <span className={`font-mono transition-colors ${answer.length > 500 ? 'text-neon-teal' : 'text-white/30'}`}>
                                    {answer.length} chars
                                </span>
                                {answer.length > 0 && (
                                    <span className="text-white/20 hidden md:inline-block">
                                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans mr-1">CTRL</kbd> +
                                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-sans ml-1">ENTER</kbd> TO SUBMIT
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        if (confirm("Are you surely you want to abort this session? Progress will be saved.")) {
                                            if (sessionId) {
                                                setLoading(true);
                                                try {
                                                    await AppService.stopInterview(sessionId);
                                                    localStorage.removeItem('fab_session_id');
                                                } catch (e) {
                                                    console.warn("Manual termination failed:", e);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }
                                            navigate('/interview/summary');
                                        }
                                    }}
                                    className="text-white/30 hover:text-red-400 text-xs flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                                    disabled={loading}
                                >
                                    <StopCircle size={14} /> ABORT
                                </button>

                                <button
                                    onClick={handleSend}
                                    disabled={!answer.trim() || loading}
                                    className={`
                                        bg-neon-teal hover:bg-neon-teal/90 disabled:opacity-50 disabled:cursor-not-allowed
                                        text-obsidian-950 font-bold py-2.5 px-6 rounded-lg 
                                        flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(13,242,242,0.15)]
                                        hover:shadow-[0_0_30px_rgba(13,242,242,0.3)] hover:-translate-y-0.5
                                    `}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>SUBMIT RESPONSE <Send size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Rail: Stats & Feedback (3 Cols) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Live Score Display */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-teal via-neon-cyan to-neon-purple opacity-50" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Current Session Performance</h3>

                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                                    {lastResponse ? lastResponse.score : 0}
                                </div>
                                <div className="text-xs text-neon-teal mt-1 font-mono">SATISFACTION INDEX</div>
                            </div>

                            {/* Strikes Visual */}
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className={`w-2 h-8 rounded-sm transition-colors ${(lastResponse?.redFlags?.length || 0) > i ? 'bg-neon-red shadow-[0_0_10px_rgba(255,59,48,0.5)]' : 'bg-white/10'
                                            }`} />
                                    ))}
                                </div>
                                <span className="text-[10px] text-white/30 font-mono tracking-wider">STRIKES</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Vibe Meter */}
                    {lastResponse?.vibe && (
                        <VibePulseMeter
                            clarity={lastResponse.vibe.clarity}
                            confidence={lastResponse.vibe.confidence}
                            brevity={lastResponse.vibe.brevity}
                        />
                    )}

                    {/* Feedback Feed */}
                    <div className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-px bg-white/5" />
                        <AnimatePresence>
                            {lastResponse && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={lastResponse.score}
                                >
                                    <ScoreBreakdown
                                        score={lastResponse.score}
                                        satisfaction={lastResponse.satisfaction}
                                        feedback={lastResponse.feedback}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Decorative Footer */}
                    <div className="text-center opacity-30">
                        <Loader2 className="animate-[spin_10s_linear_infinite] mx-auto mb-2 text-white" size={24} />
                        <p className="text-[10px] font-mono tracking-[0.2em] text-white">SYSTEM MONITORING ACTIVE</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
