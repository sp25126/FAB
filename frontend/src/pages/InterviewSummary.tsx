import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppService } from '../api/endpoints';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { CheckCircle, XCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useProfile } from '../hooks/useProfile';

export const InterviewSummary: React.FC = () => {
    const navigate = useNavigate();
    const { username: sessionUsername, refreshProfile } = useProfile();
    const storedSessionId = localStorage.getItem('fab_session_id');

    // Fetch from AppService
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [suggestion, setSuggestion] = useState<any>(null);
    const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
    const username = sessionUsername || 'user';

    useEffect(() => {
        const fetchSummary = async () => {
            if (!storedSessionId) return;
            try {
                // Pass username to allow history lookup if live session is gone
                const data = await AppService.getInterviewSummary(storedSessionId, username);
                setSummary(data);
                await refreshProfile();

                // Fetch coaching suggestion if score is below 90
                if (data.score < 90) {
                    const idea = await AppService.getCoachingSuggestion(username);
                    if (idea && idea.title) {
                        setSuggestion(idea);
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch summary", e);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [storedSessionId]);

    const handleAcceptChallenge = async () => {
        if (!suggestion) return;
        setGeneratingRoadmap(true);
        try {
            const roadmap = await AppService.acceptProjectChallenge(username, suggestion);
            localStorage.setItem('fab_current_roadmap', JSON.stringify(roadmap));
            navigate('/roadmap');
        } catch (e) {
            console.error("Failed to generate roadmap", e);
            alert("Failed to generate roadmap. Please try again.");
        } finally {
            setGeneratingRoadmap(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-white/40">Calculating final verdict...</div>;
    if (!summary) return <div className="p-8 text-center">No session data found.</div>;

    const isPass = summary.score >= 70;

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-center p-8 rounded-2xl border-2 ${isPass ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                    }`}
            >
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isPass ? 'bg-green-500 text-obsidian' : 'bg-red-500 text-white'
                    }`}>
                    {isPass ? <CheckCircle size={40} /> : <XCircle size={40} />}
                </div>

                <h1 className="text-4xl font-display font-bold mb-2">
                    {isPass ? 'INTERROGATION PASSED' : 'FAILED TO MEET STANDARDS'}
                </h1>
                <p className="text-lg text-white/60">
                    Final Score: <span className="font-mono font-bold text-white">{summary.score}/100</span>
                </p>
            </motion.div>

            {/* AI Improvement Plan */}
            {summary.improvementPlan && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <h2 className="text-xl font-bold text-white/40 uppercase tracking-widest">Growth Blueprint</h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-neon-cyan font-mono text-sm mb-6 leading-relaxed italic">
                            "{summary.improvementPlan.overallAdvice}"
                        </p>

                        <div className="space-y-8">
                            {summary.improvementPlan.questionBreakdown?.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-4 border-l-2 border-neon-red/30 pl-6 relative">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-obsidian border-2 border-neon-red" />

                                    <h4 className="font-bold text-white/90">{item.question}</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                                            <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Blind Spot</span>
                                            <p className="text-sm text-white/70">{item.weakness}</p>
                                        </div>
                                        <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/10">
                                            <span className="text-[10px] font-bold text-green-400 uppercase block mb-1">The Better Way</span>
                                            <p className="text-sm text-white/70 italic">{item.theBetterWay}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Coaching Suggestion Card */}
            {suggestion && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-panel p-8 rounded-2xl border border-neon-cyan/30 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-neon-cyan">
                        <RefreshCw size={100} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-neon-cyan/20 text-neon-cyan px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                AI Coach Recommendation
                            </span>
                            <span className="text-white/40 text-xs uppercase font-bold">
                                {suggestion.difficulty} Challenge
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">{suggestion.title}</h2>
                        <p className="text-white/70 mb-6 max-w-xl">{suggestion.description}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {suggestion.skillsTargeted?.map((skill: string) => (
                                <span key={skill} className="text-xs border border-white/10 px-2 py-1 rounded text-white/60">
                                    {skill}
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={handleAcceptChallenge}
                            disabled={generatingRoadmap}
                            className="bg-neon-cyan text-black font-bold py-3 px-6 rounded-lg hover:bg-neon-cyan/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingRoadmap ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    Generating Roadmap...
                                </>
                            ) : (
                                <>
                                    Accept Challenge
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScoreBreakdown score={summary.score} satisfaction={summary.satisfaction} feedback={summary.feedback} />

                <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex flex-col justify-center gap-4">
                    <h3 className="font-bold text-lg">Next Steps</h3>
                    <button
                        onClick={() => navigate('/growth')}
                        className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-between group transition-colors"
                    >
                        <span>View Growth Report</span>
                        <ChevronRight className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/interview/setup')}
                        className="w-full py-3 px-4 bg-neon-teal/10 hover:bg-neon-teal/20 text-neon-teal border border-neon-teal/20 rounded-lg flex items-center justify-between group transition-colors"
                    >
                        <span>Retry w/ New Questions</span>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
