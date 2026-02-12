import React, { useState } from 'react';
import { AppService } from '../../api/endpoints';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, AlertTriangle, Loader2, ArrowLeft, Binary, Activity, Layout, Layers, Terminal } from 'lucide-react';

interface Props {
    username: string;
    githubToken: string;
    onBack: () => void;
}

export const CodeQualityAnalyzer: React.FC<Props> = ({ username, githubToken, onBack }) => {
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!projectName.trim()) {
            setError('Operational target missing. Specify repository identifier.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await AppService.analyzeCodeQuality(username, projectName, githubToken);
            setReport(result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Spectral audit failure. Check repo permissions.');
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
                    <span className="text-sm font-bold uppercase tracking-widest">Return to Base</span>
                </button>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <Activity className="text-indigo-400" size={32} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Spectral Code Audit</h1>
                    </div>
                    <p className="text-xl text-white/50 font-light max-w-2xl">
                        Deep-scanning codebase structure for anti-patterns, complexity leaks, and architectural entropy.
                    </p>
                </div>

                {!report ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-10"
                    >
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                    Quality Intelligence Agent
                                </h2>
                                <p className="text-white/60 font-light leading-relaxed">
                                    Our agent executes a 360° health check on your selected project, performing high-fidelity analysis on naming conventions, error distribution, and cyclomatic complexity.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        { icon: <Terminal size={14} />, text: 'Anti-pattern detection' },
                                        { icon: <Layers size={14} />, text: 'Complexity mapping' },
                                        { icon: <Shield size={14} />, text: 'Security smell audit' }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40">
                                            <div className="text-indigo-400">{item.icon}</div> {item.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Target Repository</label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-lg"
                                        placeholder="project-slug"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={18} /> Analyzing Core...</> : <><Sparkles size={18} /> Initialize Spectral Audit</>}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center gap-3">
                                <AlertTriangle size={18} /> {error}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-8 pb-12">
                        {/* Overall Health Dashboard */}
                        <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                <Activity size={200} />
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                                <div className="space-y-4 max-w-xl">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Holistic Score</p>
                                    <h2 className="text-4xl font-black">{report.grade} GRADE</h2>
                                    <p className="text-xl text-white/60 font-light leading-relaxed italic">
                                        "{report.summary}"
                                    </p>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] group-hover:bg-indigo-500/30 transition-all" />
                                    <div className="relative h-48 w-48 rounded-full border-8 border-white/5 flex flex-col items-center justify-center bg-[#0a0a0a]">
                                        <div className={`text-6xl font-black ${report.overallScore >= 80 ? 'text-green-400' : report.overallScore >= 60 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                            {report.overallScore}
                                        </div>
                                        <div className="text-[10px] font-black uppercase text-white/30 mt-1 tracking-widest">Base Index</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metric Grid */}
                        <div className="grid md:grid-cols-4 gap-6">
                            {[
                                { label: 'Complexity', score: report.metrics.complexity.score, icon: <Binary size={16} /> },
                                { label: 'Errors', score: report.metrics.errorHandling.score, icon: <Shield size={16} /> },
                                { label: 'Docs', score: report.metrics.documentation.score, icon: <Layout size={16} /> },
                                { label: 'Naming', score: report.metrics.naming.score, icon: <Activity size={16} /> }
                            ].map((m, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-indigo-400">{m.icon}</div>
                                        <div className="text-xl font-black">{m.score}</div>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{m.label}</p>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${m.score}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Detailed Findings */}
                            {report.codeSmells.length > 0 && (
                                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <AlertTriangle className="text-amber-400" /> Detected Smells
                                    </h3>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {report.codeSmells.map((smell: any, i: number) => (
                                            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 hover:border-amber-500/30 transition-colors">
                                                <p className="font-bold text-sm text-white">{smell.smell}</p>
                                                <p className="text-[10px] font-mono text-white/40">{smell.file}:{smell.line}</p>
                                                <div className="flex items-start gap-2 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                                                    <Zap size={12} className="text-indigo-400 mt-1 shrink-0" />
                                                    <p className="text-xs text-indigo-300 italic">{smell.suggestion}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Refactoring Vector */}
                            <div className="bg-gradient-to-br from-indigo-500/5 to-transparent border border-indigo-500/10 p-8 rounded-3xl space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <Activity className="text-indigo-400" /> Refactoring Roadmap
                                </h3>
                                <div className="space-y-4">
                                    {report.refactoringSuggestions.map((s: string, i: number) => (
                                        <div key={i} className="flex items-start gap-4 group">
                                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-[10px] font-black group-hover:bg-indigo-500 transition-colors">
                                                {i + 1}
                                            </div>
                                            <p className="text-sm text-white/70 font-light leading-relaxed">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setReport(null)}
                            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white/40 hover:text-white"
                        >
                            Reset Audit Session
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
