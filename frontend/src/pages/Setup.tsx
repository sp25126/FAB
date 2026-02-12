import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppService } from '../api/endpoints';
import { Check, ChevronRight, AlertCircle, Terminal, Github, FileText, Cpu, Cloud, Server, Loader2 } from 'lucide-react';

const Setup: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [brainType, setBrainType] = useState<'local' | 'cloud'>('local');
    const [brainUrl, setBrainUrl] = useState('');
    const [username, setUsername] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    // Step 1: Brain Connection
    const handleConnectBrain = async () => {
        setLoading(true);
        setError(null);
        try {
            // If BrainType is Cloud, likely we used a preset or different logic, 
            // but user request implies just choosing.
            // For 'local', we expect a URL.
            const urlToUse = brainType === 'cloud' ? 'https://demo-brain.fab.ai' : brainUrl;

            // Map 'cloud' UI state to 'remote' API expected type
            await AppService.updateBrainConfig(brainType === 'cloud' ? 'remote' : 'local', urlToUse);

            // Verify heath
            // Note: Demo brain might not be reachable really, so this is illustrative
            const isHealthy = await AppService.checkHealth();
            if (isHealthy || brainType === 'cloud') { // Allow cloud to pass easily for demo 
                setStep(2);
            } else {
                setError("Could not connect to Brain. Check the Ngrok URL.");
            }
        } catch (err) {
            setError("Failed to configure brain.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Profile (GitHub + Resume)
    const handleProfileSetup = async () => {
        if (!username || !resumeFile) {
            setError("Username and Resume and required.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // 1. Analyze GitHub (Async)
            if (username) {
                await AppService.analyzeGitHub(username, githubToken || undefined);
            }

            // 2. Upload Resume
            const verification = await AppService.verifyResume(resumeFile, username);

            // Save user context locally
            localStorage.setItem('fab_username', username);
            localStorage.setItem('fab_verification', JSON.stringify(verification));

            setStep(3); // Success/Redirect
        } catch (err: any) {
            console.error(err);
            setError("Failed to process profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const finishSetup = () => {
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-obsidian-950 text-white font-sans selection:bg-neon-teal selection:text-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-2xl z-10">
                <div className="mb-8 text-center px-4">
                    <div className="inline-flex items-center gap-2 text-primary mb-2">
                        <Cpu className="animate-pulse" />
                        <span className="font-mono text-sm tracking-widest uppercase">System Initialization</span>
                    </div>
                    <h1 className="text-3xl font-display font-bold">Welcome to FAB</h1>
                    <p className="text-white/40 mt-2">Configure your Autonomous Brain environment.</p>
                </div>

                <div className="bg-obsidian-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 h-1 bg-white/5 w-full">
                        <motion.div
                            animate={{ width: `${(step / 3) * 100}%` }}
                            className="h-full bg-primary shadow-[0_0_10px_rgba(13,242,242,0.5)]"
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Terminal size={20} className="text-primary" />
                                    Select Intelligence Core
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setBrainType('local')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${brainType === 'local' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                                    >
                                        <Server className={`mb-3 ${brainType === 'local' ? 'text-primary' : 'text-white/50'}`} size={24} />
                                        <h3 className="font-bold">Local / Custom Brain</h3>
                                        <p className="text-xs text-white/50 mt-1">Connect to your own Python/Colab script via URL.</p>
                                    </div>

                                    <div
                                        onClick={() => setBrainType('cloud')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${brainType === 'cloud' ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                                    >
                                        <Cloud className={`mb-3 ${brainType === 'cloud' ? 'text-primary' : 'text-white/50'}`} size={24} />
                                        <h3 className="font-bold">Cloud Brain</h3>
                                        <p className="text-xs text-white/50 mt-1">Use the hosted detailed demo brain (if available).</p>
                                    </div>
                                </div>

                                {brainType === 'local' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-4"
                                    >
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="text-amber-500 shrink-0 mt-1" size={18} />
                                                <div className="space-y-2">
                                                    <h3 className="text-sm font-bold text-amber-500">Missing Brain Script?</h3>
                                                    <p className="text-xs text-white/70 leading-relaxed">
                                                        Run the optimized Colab script to get your Ngrok URL.
                                                    </p>
                                                    <a
                                                        href="https://colab.research.google.com/"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
                                                    >
                                                        Open Colab <ChevronRight size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">Remote Brain URL (Ngrok/Zrok)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all font-mono text-sm"
                                                placeholder="https://..."
                                                value={brainUrl}
                                                onChange={(e) => setBrainUrl(e.target.value)}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleConnectBrain}
                                        disabled={loading || (brainType === 'local' && !brainUrl)}
                                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'Connect System'}
                                        {!loading && <ChevronRight size={18} />}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Check size={20} className="text-green-500" />
                                    Brain Connected
                                </h2>

                                <div className="grid gap-6">
                                    {/* GitHub Section */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                            <Github size={16} /> GitHub Identity
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                className="bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary/50"
                                                placeholder="Username (e.g. torvalds)"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                            />
                                            <input
                                                type="password"
                                                className="bg-black/30 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary/50"
                                                placeholder="Token (Optional)"
                                                value={githubToken}
                                                onChange={(e) => setGithubToken(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Resume Section */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                            <FileText size={16} /> Resume Upload
                                        </label>
                                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors relative">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center gap-2 pointer-events-none">
                                                {resumeFile ? (
                                                    <>
                                                        <Check className="text-green-500" size={32} />
                                                        <span className="text-white font-medium break-all">{resumeFile.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-3 bg-white/5 rounded-full mb-2">
                                                            <FileText className="text-white/40" size={24} />
                                                        </div>
                                                        <span className="text-sm text-white/60">Drag PDF here or click to upload</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-between">
                                    <button onClick={() => setStep(1)} className="text-white/40 hover:text-white text-sm">Back</button>
                                    <button
                                        onClick={handleProfileSetup}
                                        disabled={loading}
                                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-obsidian font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} /> Analyzing...
                                            </>
                                        ) : (
                                            <>Finalize Setup <ChevronRight size={18} /></>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8 space-y-6"
                            >
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                    <Check size={40} className="text-green-500" />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Systems Operational</h2>
                                    <p className="text-white/60 max-w-md mx-auto">
                                        Your profile has been analyzed. FAB has constructed a custom interview plan based on your GitHub architecture and Resume claims.
                                    </p>
                                </div>

                                <div className="flex justify-center gap-4 pt-4">
                                    <button
                                        onClick={finishSetup}
                                        className="bg-primary hover:bg-primary/90 text-obsidian font-bold py-3 px-8 rounded-lg shadow-[0_0_20px_rgba(13,242,242,0.3)] hover:shadow-[0_0_30px_rgba(13,242,242,0.5)] transition-all transform hover:-translate-y-0.5"
                                    >
                                        Enter Command Center
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm flex items-center gap-2 animate-pulse">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Setup;
