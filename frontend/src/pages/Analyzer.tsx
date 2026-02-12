import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UploadDropzone } from '../components/UploadDropzone';
import { useScrollGlow } from '../hooks/useScrollGlow';
import { useProfile } from '../hooks/useProfile';
import { useAnalysis } from '../context/AnalysisContext';
import { RepoCard } from '../components/RepoCard';
import {
    Upload, Loader2, AlertCircle, CheckCircle2, TrendingUp,
    Shield, FileText, Github, ExternalLink, Info, AlertTriangle,
    Sparkles, Target, Zap, Code, Search, Layers
} from 'lucide-react';

type SetupStep = 'TOKEN_SETUP' | 'UPLOAD';
type ViewState = SetupStep | 'PROGRESS' | 'REPORT';

export const Analyzer: React.FC = () => {
    const navigate = useNavigate();
    const { username: sessionUsername } = useProfile();
    const {
        analysisId,
        result,
        isAnalyzing,
        progress: contextProgress,
        processingPhase,
        error: contextError,
        startAnalysis,
        resetAnalysis
    } = useAnalysis();

    // Local state for setup phases only
    const [setupStep, setSetupStep] = useState<SetupStep>('TOKEN_SETUP');

    // Inputs
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');
    const [tokenValid, setTokenValid] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    // Derived State
    const viewState: ViewState = result ? 'REPORT' : (analysisId || isAnalyzing) ? 'PROGRESS' : setupStep;
    const error = contextError || localError;

    const reportRef = useRef<HTMLDivElement>(null);
    useScrollGlow(reportRef);

    useEffect(() => {
        if (sessionUsername) setUsername(sessionUsername);
    }, [sessionUsername]);

    const validateToken = async () => {
        if (!token || token.length < 20) {
            setLocalError('Invalid token format');
            return;
        }
        setTokenValid(true);
        setLocalError(null);
    };

    const handleStartAnalysis = async () => {
        if (!username || !token) {
            setLocalError('Username and token are required');
            return;
        }

        setLocalError(null);
        // startAnalysis in context handles the API call and setting analysisId
        await startAnalysis(file, username, token);
    };

    const reset = () => {
        resetAnalysis();
        setSetupStep('TOKEN_SETUP');
        setFile(null);
        setLocalError(null);
        // Token and username can persist for convenience
    };

    // ──────────────────────── View: Token Setup ────────────────────────
    if (viewState === 'TOKEN_SETUP') {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full space-y-6"
                >
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-neon-teal/10 rounded-full mb-2">
                            <Shield className="text-neon-teal" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold">Unified Profile Analyzer</h1>
                        <p className="text-white/60">Deep analysis of GitHub + Resume in one comprehensive report</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <Info className="text-amber-500 mt-0.5" size={20} />
                            <div className="text-sm">
                                <p className="font-semibold text-amber-500">GitHub Token Required</p>
                                <p className="text-white/60 mt-1">
                                    This analysis requires a Personal Access Token to avoid rate limits and access detailed project data.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Github size={18} />
                                Generate Your Token
                            </h3>
                            <ol className="text-sm text-white/60 space-y-2 list-decimal list-inside">
                                <li>
                                    Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-neon-teal hover:underline inline-flex items-center gap-1">
                                        GitHub Token Settings <ExternalLink size={12} />
                                    </a>
                                </li>
                                <li>Set token name: <code className="px-1 py-0.5 bg-white/10 rounded text-xs">FAB Analyzer</code></li>
                                <li>Select scopes: <code className="px-1 py-0.5 bg-white/10 rounded text-xs">repo</code>, <code className="px-1 py-0.5 bg-white/10 rounded text-xs">read:user</code></li>
                                <li>Click "Generate token" and copy it</li>
                            </ol>
                        </div>

                        <div className="space-y-3">
                            <label className="block">
                                <span className="text-sm text-white/60 mb-1 block">Paste Token</span>
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    onBlur={validateToken}
                                    placeholder="ghp_xxxxxxxxxxxxxxxx"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-teal/50 transition-colors"
                                />
                            </label>

                            {tokenValid && (
                                <div className="flex items-center gap-2 text-sm text-green-400">
                                    <CheckCircle2 size={16} />
                                    Token format valid
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-400">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => tokenValid && setSetupStep('UPLOAD')}
                            disabled={!tokenValid}
                            className="w-full px-6 py-3 bg-neon-teal text-obsidian-950 rounded-lg font-semibold hover:bg-neon-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Continue to Upload
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ──────────────────────── View: Upload ────────────────────────
    if (viewState === 'UPLOAD') {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full space-y-6"
                >
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-neon-purple/10 rounded-full mb-2">
                            <Upload className="text-neon-purple" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold">Upload Your Resume</h1>
                        <p className="text-white/60">Optional but recommended for full analysis</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm text-white/60 mb-2 block">GitHub Username</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="octocat"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-teal/50"
                            />
                        </label>

                        <UploadDropzone
                            onFileSelect={setFile}
                            selectedFile={file}
                            onClear={() => setFile(null)}
                        />

                        {file && (
                            <div className="flex items-center gap-2 text-sm text-white/60 bg-white/5 p-3 rounded-lg">
                                <FileText size={16} />
                                <span>{file.name}</span>
                                <button onClick={() => setFile(null)} className="ml-auto text-red-400 hover:text-red-300">
                                    Remove
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSetupStep('TOKEN_SETUP')}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleStartAnalysis}
                                disabled={isAnalyzing || !username}
                                className="flex-1 px-6 py-3 bg-neon-teal text-obsidian-950 rounded-lg font-semibold hover:bg-neon-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Starting Analysis...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Start Deep Analysis
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ──────────────────────── View: Progress ────────────────────────
    if (viewState === 'PROGRESS') {
        const percent = contextProgress || 0;

        // Map processingPhase to human-readable steps
        const phases = [
            { name: 'Fetching Repositories', active: processingPhase?.includes('Fetching') || processingPhase?.includes('Repos') },
            { name: 'Light Scanning', active: processingPhase?.includes('light scan') },
            { name: 'Resume & Skills', active: processingPhase?.includes('Resume') || processingPhase?.includes('Verifying') },
            { name: 'Initial Scoring', active: processingPhase?.includes('preliminary') },
            { name: 'Deep Analysis', active: processingPhase?.includes('Deep') },
            { name: 'Finalizing', active: processingPhase?.includes('Final') || processingPhase?.includes('Computing scores') }
        ];

        const activeIndex = phases.findLastIndex(p => p.active);

        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl w-full space-y-8"
                >
                    <div className="text-center space-y-4">
                        <div className="relative inline-flex">
                            <div className="absolute inset-0 bg-neon-teal/20 blur-2xl rounded-full animate-pulse" />
                            <div className="relative p-8 bg-black/40 border border-white/10 rounded-full">
                                <Loader2 className="text-neon-teal animate-spin" size={56} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing Your Profile</h2>
                            <p className="text-white/60 text-lg font-medium">{processingPhase || 'Processing...'}</p>
                        </div>
                    </div>

                    {/* Phase Steps */}
                    <div className="grid grid-cols-1 gap-3 px-4">
                        {phases.map((p, i) => {
                            const isPast = i < activeIndex;
                            const isCurrent = i === activeIndex;
                            return (
                                <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${isPast || isCurrent ? 'opacity-100' : 'opacity-30'}`}>
                                    {isPast ? <CheckCircle2 className="text-neon-teal" size={18} /> :
                                        isCurrent ? <Loader2 className="text-neon-purple animate-spin" size={18} /> :
                                            <div className="w-[18px] h-[18px] rounded-full border border-white/20" />}
                                    <span className={`text-sm ${isCurrent ? 'text-white font-bold' : 'text-white/60'}`}>{p.name}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">Total Progress</span>
                            <span className="text-neon-teal font-mono">{Math.round(percent)}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-neon-teal via-neon-purple to-neon-teal bg-[length:200%_100%] animate-shimmer rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    <div className="text-center text-sm text-white/40 italic">
                        The Cloud Brain is scanning your code structure...
                    </div>

                    {error && (
                        <div className="flex flex-col gap-4 mt-6">
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                            <button
                                onClick={reset}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
                            >
                                Reset Analysis
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    // ──────────────────────── View: Report ────────────────────────
    if (viewState === 'REPORT' && result) {
        // Use result directly, assuming it matches the structure expected by the template
        // Note: result is type UnifiedAnalysisResult. The previous code used 'any'.
        // We'll map it to 'report' var for minimal code change in the render block if needed,
        // but 'result' is already clean.
        const report = result;

        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-white/10"
                    ref={reportRef}
                >
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Header with overall score */}
                        {report.errors && report.errors.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                                <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                                    <AlertTriangle size={20} />
                                    Analysis Warning
                                </h3>
                                <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                                    {report.errors.map((err: string, i: number) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Background Analysis Indicator */}
                        <div className="bg-gradient-to-br from-neon-teal/10 to-neon-purple/10 border border-white/10 rounded-2xl p-8">
                            <div className="flex items-start justify-between gap-6 flex-wrap">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">{report.metadata?.githubUsername || username}</h1>
                                    <p className="text-white/60">{report.resume?.summary || 'No bio available'}</p>
                                    <div className="flex items-center gap-4 mt-4 text-sm text-white/40">
                                        <span>{report.resume?.skills?.length || 0} skills analyzed</span>
                                        <span>•</span>
                                        <span>{report.github?.projects?.length || 0} projects found</span>
                                        <span>•</span>
                                        <span>{report.github?.totalRepos || 0} repositories</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="inline-flex flex-col items-center p-6 bg-white/5 rounded-2xl border-2 border-neon-teal/30">
                                        {/* Assuming scores object exists like in UnifiedAnalysisResult */}
                                        <div className="text-6xl font-bold text-neon-teal mb-1">
                                            {/* Calculate overall or use readiness */}
                                            {Math.round((
                                                (report.scores?.honesty || 0) +
                                                (report.scores?.depth || 0) +
                                                (report.scores?.breadth || 0) +
                                                (report.scores?.experience || 0) +
                                                (report.scores?.readiness || 0)
                                            ) / 5)}
                                        </div>
                                        <div className="text-lg font-semibold text-white/60">
                                            Score
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Critical Issues */}
                        {/* Note: UnifiedAnalysisResult has 'insights.gaps'. Previous code expected 'criticalIssues'. 
                            If the backend returns different structure, we might need mapping.
                            Based on UnifiedAnalysisResult:
                        */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} />
                                    Strengths
                                </h3>
                                <div className="space-y-3">
                                    {(report.insights?.strengths || []).map((strength: any, i: number) => (
                                        <div key={i} className="p-3 bg-white/5 rounded-lg">
                                            <p className="font-medium text-sm">{strength.title}</p>
                                            <p className="text-xs text-white/60 mt-1">{strength.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Gaps */}
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                                    <AlertTriangle size={20} />
                                    Areas to Improve
                                </h3>
                                <div className="space-y-3">
                                    {(report.insights?.gaps || []).map((gap: any, i: number) => (
                                        <div key={i} className="p-3 bg-white/5 rounded-lg">
                                            <p className="font-medium text-sm">{gap.title}</p>
                                            <p className="text-xs text-white/60 mt-1">{gap.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {report.insights?.recommendations?.length > 0 && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
                                    <Target size={20} />
                                    Recommended Projects
                                </h3>
                                <div className="grid gap-4">
                                    {(report.insights?.recommendations || []).map((rec: any, i: number) => (
                                        <div key={i} className="p-4 bg-white/5 rounded-lg">
                                            <h4 className="font-semibold mb-2">{rec.title}</h4>
                                            <p className="text-sm text-white/70 mb-3">{rec.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Projects List */}
                        {report.github?.projects?.length > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Code size={24} />
                                    Analyzed Projects ({report.github.projects.length})
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {report.github.projects.map((p: any, i: number) => (
                                        <RepoCard
                                            key={i}
                                            name={p.name}
                                            description={p.description}
                                            language={p.language}
                                            stars={p.stars}
                                            complexity={p.complexity}
                                            architecture={p.architecture && p.architecture !== 'Unknown' ? [p.architecture] : []}
                                            files={p.coreFiles?.map((f: any) => f.path) || []}
                                            learnedSkills={p.learnedSkills}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Skills */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Target size={24} />
                                Skill Analysis ({report.resume?.skills?.length || 0})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-white/10">
                                        <tr className="text-left text-white/40">
                                            <th className="pb-3 pr-4">Skill</th>
                                            <th className="pb-3 pr-4">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(report.resume?.claims || []).slice(0, 20).map((claim: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5">
                                                <td className="py-3 pr-4 font-medium">{claim.skill}</td>
                                                <td className="py-3 pr-4 text-white/60">{claim.category}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Deep Dive Section */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Zap className="text-yellow-400" />
                                Advanced Deep Dive
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/interactive', { state: { username, token, feature: 'ultra-deep' } })}
                                    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-pink-400/50 transition-all text-left group"
                                >
                                    <Layers className="text-pink-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-bold text-lg mb-2">Ultra-Deep Analysis</h4>
                                    <p className="text-sm text-white/60">Analyze ALL files, architecture, security & performance insights</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/interactive', { state: { username, token, feature: 'resume-gaps' } })}
                                    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-neon-teal/50 transition-all text-left group"
                                >
                                    <Target className="text-neon-teal mb-3 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-bold text-lg mb-2">Resume Gap Analysis</h4>
                                    <p className="text-sm text-white/60">Find skills on your resume lacking GitHub proof + get project ideas</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/interactive', { state: { username, token, feature: 'code-quality' } })}
                                    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-400/50 transition-all text-left group"
                                >
                                    <Code className="text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-bold text-lg mb-2">Code Quality Deep-Dive</h4>
                                    <p className="text-sm text-white/60">Detect code smells, anti-patterns, and get refactoring suggestions</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/interactive', { state: { username, token, feature: 'project-compare' } })}
                                    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-purple-400/50 transition-all text-left group"
                                >
                                    <Search className="text-purple-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-bold text-lg mb-2">Project Comparison</h4>
                                    <p className="text-sm text-white/60">Benchmark your projects against others or external repos</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/interactive', { state: { username, token, feature: 'career-trajectory' } })}
                                    className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-green-400/50 transition-all text-left group"
                                >
                                    <TrendingUp className="text-green-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-bold text-lg mb-2">Career Trajectory</h4>
                                    <p className="text-sm text-white/60">Track your skill evolution and growth over time</p>
                                </motion.button>
                            </div>
                        </div>

                        <button
                            onClick={reset}
                            className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-all mt-8"
                        >
                            Start New Analysis
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return null;
};
