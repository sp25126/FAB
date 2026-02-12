import React, { useState } from 'react';
import { AppService } from '../../api/endpoints';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Target, Sparkles, ArrowLeft, Loader2, Activity, Milestone, Compass } from 'lucide-react';

interface Props {
    username: string;
    githubToken: string;
    onBack: () => void;
}

export const CareerTrajectoryAnalyzer: React.FC<Props> = ({ username, githubToken, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trajectory, setTrajectory] = useState<any>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await AppService.analyzeCareerTrajectory(username, githubToken);
            setTrajectory(result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Journey mapping failed. Verify GitHub context.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 selection:bg-neon-teal/30">
            <div className="max-w-6xl mx-auto space-y-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group mb-4"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Return to Lab</span>
                </button>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                            <TrendingUp className="text-green-400" size={32} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Career Trajectory</h1>
                    </div>
                    <p className="text-xl text-white/50 font-light max-w-2xl">
                        Synthesizing chronological repository history into a high-fidelity growth vector.
                    </p>
                </div>

                {!trajectory ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-10"
                    >
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                    Chronological Synthesis
                                </h2>
                                <p className="text-white/60 font-light leading-relaxed">
                                    Our agent will scan your commit patterns, repository transitions, and complexity shifts to build a mathematical model of your professional evolution.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        { icon: <Clock size={16} />, text: 'Skill integration timeline' },
                                        { icon: <Activity size={16} />, text: 'Complexity growth velocity' },
                                        { icon: <Compass size={16} />, text: 'Domain shift detection' }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-bold text-white/40 uppercase tracking-widest">
                                            <div className="text-green-400">{item.icon}</div> {item.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-green-500/20 blur-[100px] group-hover:bg-green-500/30 transition-all" />
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="relative w-full aspect-square bg-white/5 border border-white/10 rounded-full flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-all group overflow-hidden"
                                >
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-green-400" size={48} />
                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-green-400">Processing Stream...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles className="text-green-400 group-hover:scale-125 transition-transform" size={48} />
                                            <span className="text-sm font-black uppercase tracking-[0.3em]">Initialize Capture</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center gap-3">
                                <Activity size={18} /> {error}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-8 pb-12">
                        {/* AI Narrative */}
                        {trajectory.aiSummary && (
                            <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-2xl p-6 md:p-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-green-400 mb-3">
                                    <Sparkles size={20} /> Career Narrative
                                </h3>
                                <p className="text-white/80 leading-relaxed italic">
                                    "{trajectory.aiSummary}"
                                </p>
                            </div>
                        )}

                        {/* High Level Metrics */}
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Growth Vector</p>
                                <p className="text-2xl font-black text-green-400">{trajectory.growthCurve.type}</p>
                                <p className="text-[10px] text-white/40 mt-1">{trajectory.growthCurve.currentTrajectory}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Industry Percentile</p>
                                <p className="text-2xl font-black text-white">{trajectory.industryComparison.percentile}th</p>
                                <p className="text-[10px] text-white/40 mt-1">{trajectory.industryComparison.interpretation}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Total Lifecycle</p>
                                <p className="text-2xl font-black text-white">{trajectory.timeline.totalDuration}</p>
                                <p className="text-[10px] text-white/40 mt-1">First Commit: {new Date(trajectory.timeline.startDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Interactive Timeline */}
                        <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Milestone size={120} />
                            </div>

                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                <Activity className="text-green-400" /> Professional Evolution
                            </h3>

                            <div className="space-y-12 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-white/10">
                                {trajectory.skillEvolution.map((period: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="relative pl-10"
                                    >
                                        <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-[#0a0a0a] border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] z-10" />
                                        <div className="space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                <h4 className="text-lg font-bold text-white">{period.period}</h4>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 py-1 bg-white/5 rounded border border-white/10">
                                                    Complexity Index: {period.complexity}
                                                </span>
                                            </div>
                                            <p className="text-white/60 font-light text-sm leading-relaxed max-w-2xl">{period.description}</p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {period.dominantSkills.map((skill: string, j: number) => (
                                                    <span key={j} className="text-[10px] font-bold px-2 py-1 bg-green-500/10 text-green-400 rounded-md border border-green-500/20 tracking-wider">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Future Mapping */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 p-8 rounded-3xl space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <Sparkles className="text-amber-400" /> Domain Predictions
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Recommended Focus</p>
                                        <p className="text-lg font-bold text-white">{trajectory.predictions.recommendedFocus}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Next Knowledge Modules</p>
                                        <div className="flex flex-wrap gap-2">
                                            {trajectory.predictions.nextSkills.map((skill: string, i: number) => (
                                                <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:border-amber-400/50 transition-colors">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 italic pt-4">Estimated Seniority Readiness: {trajectory.predictions.estimatedSeniorReadiness}</p>
                                </div>
                            </div>

                            {/* Industry Recommendation */}
                            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl flex flex-col justify-center gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Target className="text-blue-400" /> Market Alignment
                                    </h3>
                                    <p className="text-white/60 font-light text-sm">{trajectory.industryComparison.recommendation}</p>
                                </div>
                                <button
                                    onClick={() => setTrajectory(null)}
                                    className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white/40 hover:text-white mt-auto"
                                >
                                    Force Recalculation
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
