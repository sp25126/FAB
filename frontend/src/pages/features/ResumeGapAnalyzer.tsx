import React, { useState } from 'react';
import { AppService } from '../../api/endpoints';
import { motion } from 'framer-motion';
import { Target, Upload, AlertCircle, Zap, ArrowLeft, Loader2, FileSearch, Lightbulb } from 'lucide-react';

interface Props {
    username: string;
    githubToken: string;
    onBack: () => void;
}

export const ResumeGapAnalyzer: React.FC<Props> = ({ username, githubToken, onBack }) => {
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [focusRole, setFocusRole] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [forceRefreshNext, setForceRefreshNext] = useState(false);

    const handleAnalyze = async () => {
        if (!resumeFile) {
            setError('Resume source missing. Please provide a file for synchronization.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Pass forceRefreshNext to the API
            const result = await AppService.analyzeResumeGaps(resumeFile, username, githubToken, focusRole, forceRefreshNext);
            setAnalysis(result);
            // Reset the flag after successful analysis
            if (forceRefreshNext) setForceRefreshNext(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Cross-referencing failed. Ensure GitHub context is active.');
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
                    <span className="text-sm font-bold uppercase tracking-widest">Back to Lab</span>
                </button>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neon-teal/10 rounded-2xl border border-neon-teal/20">
                            <Target className="text-neon-teal" size={32} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Resume Gap Finder</h1>
                    </div>
                    <p className="text-xl text-white/50 font-light max-w-2xl">
                        Cross-referencing resume claims against GitHub reality to identify high-impact growth opportunities.
                    </p>
                </div>

                {!analysis ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-8 backdrop-blur-xl"
                    >
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">Primary Document</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.doc,.txt"
                                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={loading}
                                    />
                                    <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/10 rounded-2xl group-hover:border-neon-teal/50 transition-all bg-white/[0.02]">
                                        <Upload className={`text-white/20 group-hover:text-neon-teal transition-colors ${resumeFile ? 'text-neon-teal' : ''}`} size={32} />
                                        <p className="text-sm font-medium text-white/60">
                                            {resumeFile ? resumeFile.name : 'Drop resume or click to browse'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">Optimization Target</label>
                                <input
                                    type="text"
                                    value={focusRole}
                                    onChange={(e) => setFocusRole(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-teal/50 transition-all font-mono text-lg h-[104px]"
                                    placeholder="e.g. Senior Backend Engineer"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center gap-3">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !resumeFile}
                            className="w-full py-4 bg-gradient-to-r from-neon-teal to-blue-600 rounded-xl font-bold hover:from-neon-teal/80 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-white"
                        >
                            {loading ? <><Loader2 className="animate-spin" size={20} /> Performing Audit...</> : 'Initialize Cross-Reference'}
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Claims', value: analysis.summary.totalClaims, color: 'text-white' },
                                { label: 'GitHub Verified', value: analysis.summary.verified, color: 'text-neon-teal' },
                                { label: 'Weak Evidence', value: analysis.summary.weakEvidence, color: 'text-amber-400' },
                                { label: 'Missing Evidence', value: analysis.summary.noEvidence, color: 'text-rose-400' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Strategic Analysis */}
                        {analysis.aiReasoning && (
                            <div className="bg-gradient-to-r from-neon-teal/10 to-blue-600/10 border border-neon-teal/20 rounded-2xl p-6 md:p-8">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-neon-teal mb-3">
                                    <Zap size={20} /> AI Strategic Analysis
                                </h3>
                                <p className="text-white/80 leading-relaxed italic">
                                    "{analysis.aiReasoning}"
                                </p>
                            </div>
                        )}

                        {/* Critical Gaps */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                <AlertCircle className="text-rose-400" /> Resolution Priority
                            </h3>
                            <div className="grid gap-6">
                                {analysis.criticalGaps.map((gap: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-white/5 border-l-4 border-rose-500 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <FileSearch size={100} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-rose-400 mb-2">{gap.skill}</h4>
                                            <p className="text-white/60 font-light max-w-2xl">{gap.reason}</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6 relative z-10">
                                            {[gap.proofSuggestion.option1, gap.proofSuggestion.option2].map((opt, j) => (
                                                <div key={j} className="bg-white/[0.03] border border-white/5 p-5 rounded-xl hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Zap className="text-neon-teal" size={16} />
                                                        <p className="text-xs font-black uppercase tracking-widest text-white/80">{opt.title}</p>
                                                    </div>
                                                    <p className="text-sm text-white/50 leading-relaxed mb-4">{opt.description}</p>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-neon-teal bg-neon-teal/5 px-2 py-1 rounded w-fit">
                                                        ⏱️ Estimated {opt.estimatedTime}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Gap Crusher Project */}
                        {analysis.gapCrusherProject && (
                            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-3xl p-8 md:p-12 space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-5">
                                    <Target size={150} className="text-amber-500" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black flex items-center gap-3 text-amber-500 mb-2">
                                        <Zap className="fill-current" /> GAP CRUSHER PROJECT
                                    </h3>
                                    <p className="text-white/60 text-lg font-light max-w-2xl mb-8">
                                        A custom-designed challenge to systematically eliminate your critical skill gaps and prove your competence.
                                    </p>

                                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h4 className="text-2xl font-bold text-white mb-2">{analysis.gapCrusherProject.title}</h4>
                                                <p className="text-white/70 italic">"{analysis.gapCrusherProject.description}"</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest rounded-full">
                                                    {analysis.gapCrusherProject.difficulty}
                                                </span>
                                                <span className="px-3 py-1 bg-white/10 text-white/50 text-xs font-bold uppercase tracking-widest rounded-full">
                                                    {analysis.gapCrusherProject.estimatedTime}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Tech Stack</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.gapCrusherProject.techStack.map((tech: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/70 font-mono">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Key Features</p>
                                                <ul className="space-y-1">
                                                    {analysis.gapCrusherProject.features.map((feature: string, i: number) => (
                                                        <li key={i} className="text-sm text-white/60 flex items-center gap-2">
                                                            <div className="w-1 h-1 bg-amber-500 rounded-full" /> {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            try {
                                                const btn = document.getElementById('accept-btn');
                                                if (btn) btn.innerText = 'Generating Roadmap...';

                                                await AppService.acceptProjectChallenge(username, analysis.gapCrusherProject);
                                                alert('Challenge Accepted! Project roadmap saved to your profile.');
                                                if (btn) btn.innerText = 'Challenge Accepted ✓';
                                            } catch (e) {
                                                alert('Failed to accept challenge. Please try again.');
                                                console.error(e);
                                            }
                                        }}
                                        id="accept-btn"
                                        className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                                    >
                                        <Target size={20} /> Accept Challenge & Generate Roadmap
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Plan */}
                        <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-white/5 rounded-3xl p-8 md:p-12 space-y-8">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                <Lightbulb className="text-blue-400" /> Agent Strategy
                            </h3>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Tactical Quick Wins</p>
                                    <ul className="space-y-3">
                                        {analysis.recommendations.quickWins.map((w: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-white/60 font-light">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" /> {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Strategic Evolution</p>
                                    <ul className="space-y-3">
                                        {analysis.recommendations.longTerm.map((l: string, i: number) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-white/60 font-light">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" /> {l}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>



                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => setAnalysis(null)}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white/40 hover:text-white"
                            >
                                Upload New Resume (Keep History)
                            </button>

                            <button
                                onClick={() => {
                                    setAnalysis(null);
                                    // Set a flag to force refresh next time
                                    // We can just call handleAnalyze with forceRefresh=true if we had the file, 
                                    // but we need to go back to upload screen.
                                    // So we'll use a state variable.
                                    setForceRefreshNext(true);
                                }}
                                className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300 flex items-center justify-center gap-2"
                            >
                                <Zap size={16} /> Reset & Clear History
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
