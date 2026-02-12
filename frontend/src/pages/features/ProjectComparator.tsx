import React, { useState } from 'react';
import { AppService } from '../../api/endpoints';
import { motion } from 'framer-motion';
import { GitCompare, Zap, AlertTriangle, Loader2, ArrowLeft, BarChart3, Binary, Sword, Target, Sparkles } from 'lucide-react';

interface Props {
    username: string;
    githubToken: string;
    onBack: () => void;
}

export const ProjectComparator: React.FC<Props> = ({ username, githubToken, onBack }) => {
    const [mode, setMode] = useState<'own' | 'external'>('own');
    const [project1, setProject1] = useState('');
    const [project2, setProject2] = useState('');
    const [myProject, setMyProject] = useState('');
    const [externalRepo, setExternalRepo] = useState('');
    const [depth, setDepth] = useState<'light' | 'moderate'>('moderate');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comparison, setComparison] = useState<any>(null);

    const handleCompare = async () => {
        setLoading(true);
        setError(null);

        try {
            const params: any = { username, githubToken };
            if (mode === 'own') {
                if (!project1 || !project2) throw new Error('Dual target domains required for synchronization.');
                params.project1 = project1;
                params.project2 = project2;
            } else {
                if (!myProject || !externalRepo) throw new Error('Internal project and external benchmark target required.');
                params.myProject = myProject;
                params.externalRepo = externalRepo;
                params.analysisDepth = depth;
            }

            const result = await AppService.compareProjects(params);
            setComparison(result);
        } catch (err: any) {
            setError(err.message || 'Comparison stream failure. Verify repository accessibility.');
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
                    <span className="text-sm font-bold uppercase tracking-widest">Abort Session</span>
                </button>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <GitCompare className="text-blue-400" size={32} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Project Comparator</h1>
                    </div>
                    <p className="text-xl text-white/50 font-light max-w-2xl">
                        Benchmarking architectural integrity and complexity vectors across distinct codebase domains.
                    </p>
                </div>

                {!comparison ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-10"
                    >
                        <div className="flex p-1 bg-white/5 rounded-2xl w-fit mx-auto">
                            {[
                                { id: 'own', label: 'Internal Audit', icon: <Binary size={14} /> },
                                { id: 'external', label: 'Market Benchmark', icon: <Target size={14} /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMode(tab.id as any)}
                                    className={`flex items - center gap - 2 px - 8 py - 3 rounded - xl font - black uppercase tracking - widest text - [10px] transition - all ${mode === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/40 hover:text-white'} `}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {mode === 'own' ? (
                                <div className="grid gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Source Project</label>
                                        <input
                                            type="text"
                                            value={project1}
                                            onChange={(e) => setProject1(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                            placeholder="repository-1"
                                        />
                                    </div>
                                    <div className="flex justify-center -my-3 relative z-10">
                                        <div className="p-3 bg-blue-500/20 rounded-full border border-blue-500/30 backdrop-blur-md">
                                            <Sword className="text-blue-400" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Target Project</label>
                                        <input
                                            type="text"
                                            value={project2}
                                            onChange={(e) => setProject2(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                            placeholder="repository-2"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Your Implementation</label>
                                        <input
                                            type="text"
                                            value={myProject}
                                            onChange={(e) => setMyProject(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                            placeholder="your-repo-name"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Target Benchmark (URL)</label>
                                        <input
                                            type="text"
                                            value={externalRepo}
                                            onChange={(e) => setExternalRepo(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-sm"
                                            placeholder="https://github.com/microsoft/vscode"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['light', 'moderate'].map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => setDepth(d as any)}
                                                className={`py - 3 rounded - xl text - [10px] font - black uppercase tracking - widest border transition - all ${depth === d ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-white/30 hover:text-white'} `}
                                            >
                                                {d} Vector
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] group-hover:bg-blue-500/30 transition-all" />
                                <button
                                    onClick={handleCompare}
                                    disabled={loading}
                                    className="relative w-full aspect-square bg-white/5 border border-white/10 rounded-full flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-all group overflow-hidden"
                                >
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-blue-400" size={48} />
                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Comparing Matrices...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles className="text-blue-400 group-hover:scale-125 transition-transform" size={48} />
                                            <span className="text-xs font-black uppercase tracking-[0.3em]">Ignition</span>
                                        </>
                                    )}
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
                        {/* Comparison Matrix */}
                        <div className="grid md:grid-cols-2 gap-8 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block">
                                <div className="p-4 bg-[#0a0a0a] border-4 border-white/10 rounded-full">
                                    <Sword className="text-blue-400 rotate-45" size={24} />
                                </div>
                            </div>

                            {[
                                { data: mode === 'own' ? comparison.project1 : comparison.myProject, title: 'Project Alpha' },
                                { data: mode === 'own' ? comparison.project2 : comparison.externalProject, title: 'Project Beta' }
                            ].map((project, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden"
                                >
                                    <div className="absolute -top-10 -right-10 opacity-5">
                                        <Binary size={160} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{project.title}</p>
                                        <h3 className="text-3xl font-black tracking-tight">{project.data.name}</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Stars</p>
                                            <div className="flex items-center gap-1 text-yellow-400 font-black">
                                                <Sparkles size={12} /> {project.data.stars}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Complexity</p>
                                            <div className="text-blue-400 font-black">{project.data.complexity}</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Quality</p>
                                            <div className="text-green-400 font-black">{project.data.codeQuality}</div>
                                        </div>
                                    </div>
                                    {project.data.scoreReasoning && (
                                        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                                                <Sparkles size={12} /> Analysis Reasoning
                                            </p>
                                            <p className="text-sm text-white/70 italic leading-relaxed">
                                                "{project.data.scoreReasoning}"
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Differences Analysis */}
                        <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl space-y-8">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                <BarChart3 className="text-blue-400" /> Delta Synthesis
                            </h3>

                            {/* Feature Battle */}
                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="space-y-4">
                                    <h4 className="text-xl font-bold flex items-center gap-2 text-blue-400">
                                        <Zap size={20} />
                                        Unique Capabilities (Project Alpha)
                                    </h4>
                                    <ul className="space-y-2">
                                        {comparison.differences.features.project1.length > 0 ? (
                                            comparison.differences.features.project1.map((feat: string, i: number) => (
                                                <li key={i} className="bg-white/5 border border-white/5 rounded-lg px-4 py-3 text-sm flex items-start gap-3">
                                                    <span className="text-blue-500 font-bold">•</span>
                                                    {feat}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-white/30 italic">No specific features extracted.</li>
                                        )}
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xl font-bold flex items-center gap-2 text-purple-400">
                                        <Zap size={20} />
                                        Unique Capabilities (Project Beta)
                                    </h4>
                                    <ul className="space-y-2">
                                        {comparison.differences.features.project2.length > 0 ? (
                                            comparison.differences.features.project2.map((feat: string, i: number) => (
                                                <li key={i} className="bg-white/5 border border-white/5 rounded-lg px-4 py-3 text-sm flex items-start gap-3">
                                                    <span className="text-purple-500 font-bold">•</span>
                                                    {feat}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-white/30 italic">No specific features extracted.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="p-6 bg-blue-500/5 border-l-2 border-blue-500 rounded-r-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Complexity Interpretation</p>
                                        <p className="text-white/70 font-light italic leading-relaxed text-sm">
                                            "{comparison.differences.complexity.interpretation}"
                                        </p>
                                    </div>
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Architectural Convergence</p>
                                        <p className="text-lg font-bold">{comparison.differences.techStack.common.length} Shared Core Technologies</p>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {comparison.differences.techStack.common.map((tech: string, i: number) => (
                                                <span key={i} className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/10 rounded text-white/60">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Unique Tech Indicators (Project Beta)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {comparison.differences.techStack.project2Only?.map((tech: string, i: number) => (
                                                <span key={i} className="text-[10px] font-black px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                                                    {tech}
                                                </span>
                                            )) || <span className="text-white/30 italic text-sm">No unique indicators detected.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Architecture & Documentation Breakdown */}
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Binary className="text-purple-400" /> Architectural Strategy
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Project Alpha</p>
                                            <p className="font-mono text-sm text-purple-300">{comparison.differences.architecture.project1}</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Project Beta</p>
                                            <p className="font-mono text-sm text-purple-300">{comparison.differences.architecture.project2}</p>
                                        </div>
                                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                            <p className="text-xs font-bold text-purple-300 italic">
                                                "{comparison.differences.architecture.comparison}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <Sparkles className="text-green-400" /> Documentation Health
                                    </h3>
                                    <div className="flex items-end gap-4 h-32">
                                        <div className="flex-1 bg-white/5 rounded-t-xl relative group overflow-hidden">
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-blue-500/20 transition-all duration-1000"
                                                style={{ height: `${comparison.differences.documentation.project1}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">
                                                {comparison.differences.documentation.project1}
                                            </div>
                                            <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] uppercase font-bold text-white/40">Alpha</p>
                                        </div>
                                        <div className="flex-1 bg-white/5 rounded-t-xl relative group overflow-hidden">
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-purple-500/20 transition-all duration-1000"
                                                style={{ height: `${comparison.differences.documentation.project2}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">
                                                {comparison.differences.documentation.project2}
                                            </div>
                                            <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] uppercase font-bold text-white/40">Beta</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-white/50 text-center italic">
                                        {comparison.differences.documentation.gap > 0
                                            ? `Project Beta leads by ${comparison.differences.documentation.gap} points.`
                                            : comparison.differences.documentation.gap < 0
                                                ? `Project Alpha leads by ${Math.abs(comparison.differences.documentation.gap)} points.`
                                                : "Both projects have equal documentation strength."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Benchmark Insights */}
                        {mode === 'external' && comparison.learningOpportunities && (
                            <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/10 p-8 md:p-12 rounded-3xl space-y-8">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <Zap className="text-yellow-400" /> Growth Vectors Identified
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {comparison.learningOpportunities.map((opp: any, i: number) => (
                                        <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                                            <p className="font-bold text-white mb-2">{opp.pattern}</p>
                                            <p className="text-xs text-white/50 font-light mb-4 line-clamp-3">{opp.benefit}</p>
                                            <div className="flex items-center justify-between text-[10px] font-black">
                                                <span className="text-yellow-400 uppercase tracking-widest">Difficulty: {opp.difficulty}</span>
                                                <span className="text-white/30">Lvl {opp.applicability}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setComparison(null)}
                            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all text-white/40 hover:text-white"
                        >
                            Reset Benchmark
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
