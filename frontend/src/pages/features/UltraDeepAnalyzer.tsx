import React, { useState } from 'react';
import { AppService } from '../../api/endpoints';
import { motion } from 'framer-motion';
import { Layers, Shield, Zap, Code, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Binary, Cpu } from 'lucide-react';

interface Props {
    username: string;
    githubToken: string;
    onBack: () => void;
}

export const UltraDeepAnalyzer: React.FC<Props> = ({ username, githubToken, onBack }) => {
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!projectName.trim()) {
            setError('Please specify a repository identifier');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await AppService.analyzeProjectDeep(username, projectName, githubToken);
            setAnalysis(result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Deep scan failed. Ensure repository exists and token is valid.');
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
                        <div className="p-3 bg-pink-500/10 rounded-2xl border border-pink-500/20">
                            <Layers className="text-pink-400" size={32} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Ultra-Deep Analysis</h1>
                    </div>
                    <p className="text-xl text-white/50 font-light max-w-2xl">
                        Dissecting project architecture, security, and performance at the atomic level.
                    </p>
                </div>

                {!analysis ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-8 backdrop-blur-xl"
                    >
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">Target Repository</label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-pink-500/50 transition-all font-mono text-lg"
                                    placeholder="repository-name"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-bold hover:from-pink-500 hover:to-rose-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3 min-w-[200px]"
                                >
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> Scanning...</> : 'Initialize Scan'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <AlertTriangle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </motion.div>
                        )}

                        <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
                            {[
                                { icon: <Binary size={20} />, text: 'Static Analysis' },
                                { icon: <Shield size={20} />, text: 'Security Audit' },
                                { icon: <Cpu size={20} />, text: 'Perf Profile' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-white/40">
                                    <div className="p-2 bg-white/5 rounded-lg">{item.icon}</div>
                                    <span className="text-xs font-bold uppercase tracking-widest">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        {/* High Level Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Language', value: analysis.project.language, color: 'text-pink-400' },
                                { label: 'Files Scanned', value: analysis.project.totalFiles, color: 'text-white' },
                                { label: 'Total Lines', value: analysis.project.totalLines.toLocaleString(), color: 'text-white' },
                                { label: 'Overall Score', value: `${analysis.codeQuality.score}%`, color: 'text-neon-teal' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Architecture */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold flex items-center gap-3">
                                        <Code className="text-blue-400" /> Architecture
                                    </h3>
                                    <span className="px-3 py-1 bg-blue-400/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-400/20">
                                        {analysis.architecture.pattern}
                                    </span>
                                </div>
                                <p className="text-white/60 text-sm italic">{analysis.architecture.quality}</p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Strengths</p>
                                            <ul className="space-y-2">
                                                {analysis.architecture.strengths.slice(0, 3).map((s: string, i: number) => (
                                                    <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                                                        <div className="h-1 w-1 bg-green-400 rounded-full mt-1.5" /> {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Critique</p>
                                            <ul className="space-y-2">
                                                {analysis.architecture.weaknesses.slice(0, 3).map((w: string, i: number) => (
                                                    <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                                                        <div className="h-1 w-1 bg-amber-400 rounded-full mt-1.5" /> {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Security */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold flex items-center gap-3">
                                        <Shield className="text-rose-400" /> Security
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500" style={{ width: `${analysis.security.score}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-rose-400">{analysis.security.score}%</span>
                                    </div>
                                </div>

                                {analysis.security.vulnerabilities.length > 0 ? (
                                    <div className="space-y-3">
                                        {analysis.security.vulnerabilities.slice(0, 3).map((v: any, i: number) => (
                                            <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl flex items-start gap-3">
                                                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-rose-300">{v.type}</p>
                                                    <p className="text-[10px] text-white/40 font-mono mt-1">{v.file}:{v.line}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center gap-3 text-neon-teal bg-neon-teal/5 rounded-2xl border border-neon-teal/10">
                                        <CheckCircle2 size={32} />
                                        <p className="text-xs font-bold uppercase tracking-widest text-center">Protocol Secure</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Refactoring Suggestions */}
                        {analysis.codeQuality.refactoringSuggestions && analysis.codeQuality.refactoringSuggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6"
                            >
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <Zap className="text-amber-400" /> Agent Recommendations
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {analysis.codeQuality.refactoringSuggestions.slice(0, 4).map((rec: any, i: number) => (
                                        <div key={i} className="bg-white/[0.03] border border-white/5 p-4 rounded-xl space-y-2">
                                            <p className="text-[10px] font-mono text-white/30">{rec.file}</p>
                                            <p className="text-sm text-white/80 leading-relaxed font-light">{rec.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <button
                            onClick={() => setAnalysis(null)}
                            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white/60 hover:text-white"
                        >
                            Decommission Current Scan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
