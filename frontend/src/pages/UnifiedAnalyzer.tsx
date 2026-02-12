import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadDropzone } from '../components/UploadDropzone';
import { TokenTutorial } from '../components/TokenTutorial';
import { ScoreBoard } from '../components/ScoreBoard';
import { Loader2, AlertCircle, FileText, Shield, Github, TrendingUp, Target, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useScrollGlow } from '../hooks/useScrollGlow';
import { useProfile } from '../hooks/useProfile';
import { useAnalysis } from '../context/AnalysisContext';

type Step = 'upload' | 'token' | 'analyzing' | 'results';

export const UnifiedAnalyzer: React.FC = () => {
    const { profile, username: sessionUsername, refreshProfile } = useProfile();
    const {
        isAnalyzing,
        processingPhase,
        result,
        error: contextError,
        startAnalysis,
        resetAnalysis
    } = useAnalysis();

    const [file, setFile] = useState<File | null>(null);
    const [username, setUsername] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [showTokenTutorial, setShowTokenTutorial] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Determine current step based on global state
    const currentStep: Step = result ? 'results' : isAnalyzing ? 'analyzing' : 'upload';

    // If we're in 'upload' but have token/file, we might be in 'token' step manually
    // We'll manage 'token' step locally but 'analyzing' and 'results' come from context
    const [inputStep, setInputStep] = useState<'upload' | 'token'>('upload');

    // Sync error
    const error = contextError || localError;

    const resultsRef = useRef<HTMLDivElement>(null);
    useScrollGlow(resultsRef);

    useEffect(() => {
        if (sessionUsername) {
            setUsername(sessionUsername);
        }
    }, [sessionUsername]);

    // Check for previous analysis in history
    useEffect(() => {
        if (profile?.growthHistory) {
            // Logic for history check if needed
        }
    }, [profile]);

    const handleStartAnalysis = async () => {
        if (!file || !username || !githubToken) {
            setLocalError('Please provide resume, username, and GitHub token');
            return;
        }

        setLocalError(null);
        await startAnalysis(file, username, githubToken);
        // Step transition happens automatically via currentStep derived from isAnalyzing/result
        await refreshProfile();
    };

    const reset = () => {
        resetAnalysis();
        setFile(null);
        setGithubToken('');
        setLocalError(null);
        setInputStep('upload');
    };

    const processingLabels: Record<string, string> = {
        extracting: 'Extracting resume text...',
        parsing: 'Parsing resume claims...',
        github: 'Analyzing GitHub repositories...',
        verifying: 'Cross-verifying claims...',
        scoring: 'Calculating scores...',
        complete: 'Complete!',
        idle: 'Preparing...'
    };

    // ────────────────── STEP 1: UPLOAD ──────────────────
    if (currentStep === 'upload' && inputStep === 'upload') {
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
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-teal to-neon-purple bg-clip-text text-transparent">
                            Profile Analyzer
                        </h1>
                        <p className="text-white/60">
                            Comprehensive analysis combining resume verification and GitHub deep scan
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        <div className="space-y-3">
                            <label className="block">
                                <span className="text-sm text-white/60 mb-2 block">GitHub Username</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="octocat"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-teal/50 transition-colors"
                                />
                            </label>

                            <UploadDropzone
                                onFileSelect={setFile}
                                selectedFile={file}
                                onClear={() => setFile(null)}
                            />

                            {file && (
                                <div className="flex items-center gap-2 text-sm text-neon-teal bg-neon-teal/10 p-3 rounded-lg">
                                    <FileText size={16} />
                                    <span>{file.name}</span>
                                    <button onClick={() => setFile(null)} className="ml-auto text-red-400 hover:text-red-300">
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={() => file && username ? setInputStep('token') : setLocalError('Please upload resume and enter username')}
                            disabled={!file || !username}
                            className="w-full px-6 py-3 bg-gradient-to-r from-neon-teal to-neon-purple text-obsidian-950 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Continue to GitHub Setup →
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ────────────────── STEP 2: TOKEN SETUP ──────────────────
    if (currentStep === 'upload' && inputStep === 'token') {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full space-y-6"
                >
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-neon-purple/10 rounded-full mb-2">
                            <Github className="text-neon-purple" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold">Connect GitHub</h2>
                        <p className="text-white/60">
                            Required for deep repository analysis
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm text-blue-200">
                                <strong>Why do we need this?</strong><br />
                                A GitHub Personal Access Token allows us to deeply analyze your repositories,
                                including private repos, to provide accurate skill verification.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowTokenTutorial(true)}
                            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <Github size={20} />
                            <span>Get GitHub Token (Step-by-step Guide)</span>
                        </button>

                        {githubToken && (
                            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 p-3 rounded-lg">
                                <CheckCircle2 size={16} />
                                Token received
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setInputStep('upload')}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleStartAnalysis}
                                disabled={!githubToken}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
                            >
                                Start Analysis →
                            </button>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showTokenTutorial && (
                        <TokenTutorial
                            onClose={() => setShowTokenTutorial(false)}
                            onTokenProvided={(token) => {
                                setGithubToken(token);
                                setShowTokenTutorial(false);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ────────────────── STEP 3: ANALYZING ──────────────────
    if (currentStep === 'analyzing') {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl w-full space-y-6"
                >
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-6 bg-neon-teal/10 rounded-full">
                            <Loader2 className="text-neon-teal animate-spin" size={48} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing Your Profile</h2>
                            <p className="text-white/60">{processingLabels[processingPhase]}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-white/60">
                            <span>Processing...</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-neon-teal to-neon-purple"
                                initial={{ width: 0 }}
                                animate={{
                                    width: processingPhase === 'complete' ? '100%' :
                                        processingPhase === 'scoring' ? '85%' :
                                            processingPhase === 'verifying' ? '70%' :
                                                processingPhase === 'github' ? '50%' :
                                                    processingPhase === 'parsing' ? '30%' : '15%'
                                }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    <div className="text-center text-sm text-white/40">
                        This may take 1-2 minutes...
                    </div>
                </motion.div>
            </div>
        );
    }

    // ────────────────── STEP 4: RESULTS ──────────────────
    if (currentStep === 'results' && result) {
        return (
            <div className="h-full flex flex-col">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-white/10"
                    ref={resultsRef}
                >
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="text-center">
                            <h1 className="text-4xl font-bold mb-2">
                                Analysis Complete
                            </h1>
                            <p className="text-white/60">
                                {result.metadata.githubUsername} • {result.github.totalRepos} repos • {result.github.techStack.length} technologies
                            </p>
                        </div>

                        {/* Scores */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <ScoreBoard scores={result.scores} />
                        </div>

                        {/* Insights Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                                    <TrendingUp size={20} />
                                    Strengths ({result.insights.strengths.length})
                                </h3>
                                <div className="space-y-3">
                                    {result.insights.strengths.map((strength: any, i: number) => (
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
                                    Areas to Improve ({result.insights.gaps.length})
                                </h3>
                                <div className="space-y-3">
                                    {result.insights.gaps.map((gap: any, i: number) => (
                                        <div key={i} className="p-3 bg-white/5 rounded-lg">
                                            <p className="font-medium text-sm">{gap.title}</p>
                                            <p className="text-xs text-white/60 mt-1">{gap.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {result.insights.recommendations.length > 0 && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                                <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
                                    <Target size={20} />
                                    Recommended Projects
                                </h3>
                                <div className="grid gap-4">
                                    {result.insights.recommendations.map((rec: any, i: number) => (
                                        <div key={i} className="p-4 bg-white/5 rounded-lg">
                                            <h4 className="font-semibold mb-2">{rec.title}</h4>
                                            <p className="text-sm text-white/70 mb-3">{rec.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {rec.techStack.map((tech: string) => (
                                                    <span key={tech} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Verification Summary */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h3 className="text-xl font-semibold mb-4">Verification Summary</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-green-500/10 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <CheckCircle2 className="text-green-400" size={20} />
                                        <p className="text-3xl font-bold text-green-400">{result.verification.verified.length}</p>
                                    </div>
                                    <p className="text-sm text-white/60">Verified</p>
                                </div>
                                <div className="p-4 bg-yellow-500/10 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <AlertCircle className="text-yellow-400" size={20} />
                                        <p className="text-3xl font-bold text-yellow-400">{result.verification.weak.length}</p>
                                    </div>
                                    <p className="text-sm text-white/60">Weak Evidence</p>
                                </div>
                                <div className="p-4 bg-red-500/10 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <XCircle className="text-red-400" size={20} />
                                        <p className="text-3xl font-bold text-red-400">{result.verification.overclaimed.length}</p>
                                    </div>
                                    <p className="text-sm text-white/60">Overclaimed</p>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="p-4 bg-white/5 rounded-lg text-sm text-white/60 flex items-center justify-between">
                            <span>Analysis completed in {(result.metadata.processingTime / 1000).toFixed(1)}s</span>
                            <span>{result.github.totalStars} total stars • {result.github.totalForks} total forks</span>
                        </div>

                        <button
                            onClick={reset}
                            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all"
                        >
                            Run New Analysis
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return null;
};
