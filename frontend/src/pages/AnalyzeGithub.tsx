import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppService } from '../api/endpoints';
import type { GitHubAnalysisResponse } from '../api/endpoints';
import { RepoCard } from '../components/RepoCard';
import { Search, Loader2, AlertCircle, ShieldAlert, GitBranch } from 'lucide-react';
import { useScrollGlow } from '../hooks/useScrollGlow';
import { useProfile } from '../hooks/useProfile';

export const AnalyzeGithub: React.FC = () => {
    const { profile, username: sessionUsername, refreshProfile } = useProfile();
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'LIST' | 'RESULT'>('INPUT');
    const [repoList, setRepoList] = useState<any[]>([]);
    const [repoCount, setRepoCount] = useState(0);
    const [analyzeCount, setAnalyzeCount] = useState(5);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<GitHubAnalysisResponse | null>(null);

    // View state
    const isResultView = step === 'RESULT';
    const resultsRef = useRef<HTMLDivElement>(null);

    useScrollGlow(resultsRef);

    useEffect(() => {
        if (sessionUsername) {
            setUsername(sessionUsername);
        }
    }, [sessionUsername]);

    useEffect(() => {
        if (profile && profile.projects && profile.projects.length > 0) {
            // Reconstruct GitHubAnalysisResponse from profile
            setData({
                username: profile.username,
                projectCount: profile.projects.length,
                analysisMode: 'DEEP', // Assume deep for persisted history
                projects: profile.projects
            });
            setStep('RESULT');
        }
    }, [profile]);

    // Auto-scroll start
    useEffect(() => {
        if (isResultView && resultsRef.current) {
            resultsRef.current.scrollTop = 0;
        }
    }, [isResultView]);

    const handleListRepos = async () => {
        if (!username) return;
        setLoading(true);
        setError(null);
        try {
            const res = await AppService.listRepos(username, token || undefined);
            setRepoList(res.repos);
            setRepoCount(res.repoCount);
            setStep('LIST');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Could not fetch repositories. Check username.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeepAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await AppService.analyzeDeep(username, analyzeCount, token || undefined);
            setData(res);
            await refreshProfile();
            setStep('RESULT');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Deep analysis failed. Check rate limits.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('INPUT');
        setData(null);
        setRepoList([]);
        setError(null);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col relative overflow-hidden">
            {/* Scrollable Results Area */}
            <AnimatePresence>
                {step === 'RESULT' && data && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="flex-1 overflow-y-auto pb-32 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        ref={resultsRef}
                    >
                        <div className="max-w-7xl mx-auto space-y-6 pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-obsidian-950/90 backdrop-blur-sm z-10 py-4 border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-full">
                                        <GitBranch size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{data.username}</h2>
                                        <div className="flex items-center gap-2 text-sm text-white/40">
                                            <span>{data.projectCount} Analyzed</span>
                                            <span>•</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${data.analysisMode === 'DEEP' ? 'bg-neon-teal/10 text-neon-teal border-neon-teal/20' : 'bg-white/10 text-white/60 border-white/10'
                                                }`}>
                                                {data.analysisMode} SCAN
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={reset} className="text-white/40 hover:text-white text-sm">New Search</button>
                            </div>

                            {data.projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data.projects.map((repo: any) => (
                                        <RepoCard
                                            key={repo.name}
                                            name={repo.name}
                                            description={repo.description}
                                            language={repo.language}
                                            stars={repo.stars}
                                            complexity={repo.complexity}
                                            architecture={repo.topics}
                                            files={repo.files}
                                            // [NEW] Pass learned skills
                                            learnedSkills={repo.learnedSkills}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    <ShieldAlert className="mx-auto mb-4 text-orange-400" size={48} />
                                    <h3 className="text-xl font-bold text-white mb-2">No Projects Detected</h3>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky/Centered Input Area */}
            <motion.div
                layout
                className={`w-full transition-all duration-500 ease-in-out z-20 ${step !== 'INPUT'
                    ? 'absolute bottom-0 left-0 right-0 bg-obsidian-950/90 backdrop-blur-xl border-t border-white/10 p-4 shadow-2xl'
                    : 'flex-1 overflow-y-auto'
                    }`}
            >
                <div className={`w-full h-full flex flex-col ${step !== 'INPUT' ? 'justify-end' : 'justify-center items-center p-4'}`}>
                    <motion.div layout className={`w-full ${step !== 'INPUT' ? 'max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4' : 'max-w-2xl space-y-6 my-auto'}`}>

                        {/* Header (Hidden in Result View) */}
                        {step === 'INPUT' && (
                            <motion.div layoutId="header" className="text-center mb-4">
                                <h1 className="text-3xl font-display font-bold mb-2">GitHub Architecture Scan</h1>
                                <p className="text-white/60">Two-step analysis: List repositories, then Deep Scan.</p>
                            </motion.div>
                        )}

                        {/* Step 1: Input Form */}
                        {step === 'INPUT' && (
                            <div className="space-y-4 w-full glass-panel p-6 rounded-2xl">
                                <div className="relative">
                                    <label className="text-xs font-bold text-white/40 uppercase mb-1 block">Target Username</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. torvalds"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-neon-teal/50 p-3 pl-10"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                    <Search className="absolute left-3 top-8 text-white/30" size={16} />
                                </div>
                                <div className="relative">
                                    <label className="text-xs font-bold text-white/40 uppercase mb-1 block">PAT Token <span className="text-[10px] font-normal lowercase opacity-50">(optional)</span></label>
                                    <input
                                        type="password"
                                        placeholder="github_pat_..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-neon-teal/50 p-3"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleListRepos}
                                    disabled={loading || !username}
                                    className="w-full bg-neon-teal hover:bg-neon-teal/90 disabled:opacity-50 text-obsidian font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Fetch Repositories'}
                                </button>
                            </div>
                        )}

                        {/* Step 2: Selection & Deep Scan */}
                        {step === 'LIST' && (
                            <div className="w-full flex flex-col gap-6">
                                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-neon-teal/10 rounded-full">
                                            <GitBranch size={24} className="text-neon-teal" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Found {repoCount} Repositories</h3>
                                            <p className="text-sm text-white/40">Ready for Deep Analysis</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-white/60">Analyze Top:</label>
                                            <select
                                                value={analyzeCount}
                                                onChange={(e) => setAnalyzeCount(Number(e.target.value))}
                                                className="bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-neon-teal/50"
                                            >
                                                <option value={3}>3 Repos (Fast)</option>
                                                <option value={5}>5 Repos</option>
                                                <option value={10}>10 Repos</option>
                                                <option value={20}>20 Repos (Slow)</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleDeepAnalyze}
                                            disabled={loading}
                                            className="bg-neon-teal hover:bg-neon-teal/90 disabled:opacity-50 text-obsidian font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Start Deep Scan'}
                                        </button>
                                    </div>
                                </div>

                                {/* Mini Preview of Top Repos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                    {repoList.slice(0, 3).map((r: any) => (
                                        <div key={r.name} className="p-3 border border-white/10 rounded bg-white/5 text-xs">
                                            <div className="font-bold text-white mb-1 truncate">{r.name}</div>
                                            <div className="flex justify-between text-white/40">
                                                <span>⭐ {r.stars}</span>
                                                <span>{r.language}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {repoList.length > 3 && (
                                        <div className="p-3 flex items-center justify-center text-xs text-white/30 italic">
                                            + {repoList.length - 3} more...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Result View Controls */}
                        {step === 'RESULT' && (
                            <div className="w-full"></div> // Spacer or additional controls
                        )}


                        {/* Warnings / Errors */}
                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-16 left-0 right-0 mx-auto max-w-md flex items-center gap-2 text-sm text-neon-red bg-neon-red/5 p-3 rounded border border-neon-red/20 justify-center">
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
