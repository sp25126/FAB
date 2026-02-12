import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppService } from '../api/endpoints';
import type { ResumeVerificationResponse } from '../api/endpoints';
import { UploadDropzone } from '../components/UploadDropzone';
import { BrutalTruthPanel } from '../components/BrutalTruthPanel';
import { SkillVerdictTable } from '../components/SkillVerdictTable';
import { Loader2, AlertCircle, FileText, CheckCircle2, Search, ArrowUpRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useScrollGlow } from '../hooks/useScrollGlow';
import { useProfile } from '../hooks/useProfile';
import { useNavigate } from 'react-router-dom';

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'finalizing';

export const VerifyResume: React.FC = () => {
    const navigate = useNavigate();
    const { profile, username: sessionUsername, refreshProfile } = useProfile();
    const [file, setFile] = useState<File | null>(null);
    const [username, setUsername] = useState('');
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ResumeVerificationResponse | null>(null);

    const isResultView = !!result;
    const resultsRef = useRef<HTMLDivElement>(null);
    useScrollGlow(resultsRef);

    useEffect(() => {
        if (sessionUsername) {
            setUsername(sessionUsername);
        }
    }, [sessionUsername]);

    useEffect(() => {
        if (profile?.growthHistory) {
            const latestVerification = [...profile.growthHistory]
                .filter((h: any) => h.metric === 'resume_verification_full')
                .pop();

            if (latestVerification && latestVerification.details) {
                setResult(latestVerification.details);
            }
        }
    }, [profile]);

    useEffect(() => {
        if (isResultView && resultsRef.current) {
            resultsRef.current.scrollTop = 0;
        }
    }, [isResultView]);

    const handleVerify = async () => {
        if (!file) return;
        if (!username.trim()) {
            setError("GitHub username is required.");
            return;
        }
        setProcessingStep('uploading');
        setError(null);

        try {
            // Simulated friction for realism
            setTimeout(() => setProcessingStep('extracting'), 800);
            setTimeout(() => setProcessingStep('analyzing'), 2500);
            setTimeout(() => setProcessingStep('finalizing'), 4000);

            const data = await AppService.verifyResume(file, username);
            setResult(data);
            await refreshProfile();
            setProcessingStep('idle');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || "Verification failed. System Error.");
            setProcessingStep('idle');
        }
    };

    const handleFix = (skill: string) => {
        // [MODIFIED] Navigate to dedicated FixSkills page
        navigate(`/fix-skills?skill=${encodeURIComponent(skill)}`);
    };

    const steps = [
        { id: 'uploading', label: 'Encrypting Upload...', sub: 'Secure Channel' },
        { id: 'extracting', label: 'Extracting Claims...', sub: 'NLP Parsing' },
        { id: 'analyzing', label: 'Cross-Referencing GitHub...', sub: 'Deep Scan' },
        { id: 'finalizing', label: 'Generating Verdict...', sub: 'Finalizing' },
    ];

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* Results Scroll Area */}
            <AnimatePresence>
                {isResultView && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="flex-1 overflow-y-auto pb-40 px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scroll-area"
                        ref={resultsRef}
                    >
                        <div className="max-w-7xl mx-auto space-y-8 pt-4">
                            {result && (
                                <>
                                    <BrutalTruthPanel
                                        honestyScore={result.summary.honestyScore}
                                        claimsFound={result.claimsFound}
                                        summary={`Verification Complete. Found ${result.claimsFound} verifiable claims.`}
                                    />

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                            <ShieldCheck className="text-neon-purple" size={20} />
                                            Project Portfolio Analysis
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {result.projects && result.projects.length > 0 ? (
                                                result.projects.map((project: any, idx: number) => (
                                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-neon-purple/30 transition-colors">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h4 className="font-bold text-white text-lg">{project.name}</h4>
                                                            <div className={`px-2 py-1 rounded text-xs font-bold border ${project.complexity === 'ADVANCED' ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' :
                                                                project.complexity === 'INTERMEDIATE' ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30' :
                                                                    'bg-white/10 text-white/50 border-white/10'
                                                                }`}>
                                                                {project.complexity || 'BASIC'}
                                                            </div>
                                                        </div>
                                                        <p className="text-white/60 text-sm mb-4 line-clamp-2">{project.description}</p>

                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {project.architecture && project.architecture !== 'Unknown' && (
                                                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] uppercase tracking-wider">
                                                                        {project.architecture}
                                                                    </span>
                                                                )}
                                                                {project.projectType && (
                                                                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] uppercase tracking-wider">
                                                                        {project.projectType}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {project.learnedSkills && project.learnedSkills.length > 0 && (
                                                                <div>
                                                                    <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Learned Skills</div>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {project.learnedSkills.slice(0, 5).map((skill: string, sIdx: number) => (
                                                                            <span key={sIdx} className="px-1.5 py-0.5 bg-white/5 text-white/70 rounded text-xs border border-white/5">
                                                                                {skill}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 text-center py-8 text-white/30 italic">
                                                    No projects detected in resume.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="glass-panel p-6 rounded-2xl">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                                            <ShieldCheck className="text-neon-cyan" size={20} />
                                            Skill Matrix Analysis
                                        </h3>
                                        <div className="overflow-x-auto -mx-6 md:mx-0">
                                            <SkillVerdictTable items={result.verification} onFix={handleFix} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input & Upload Zone */}
            <motion.div
                layout
                className={`w-full transition-all duration-500 ease-in-out z-20 ${isResultView
                    ? 'absolute bottom-0 left-0 right-0 bg-obsidian-925/90 backdrop-blur-2xl border-t border-white/10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]'
                    : 'flex-1 overflow-y-auto flex items-center justify-center p-4'
                    }`}
            >
                <div className={`w-full ${isResultView ? 'max-w-7xl mx-auto' : 'max-w-2xl mx-auto space-y-8'}`}>

                    {/* Header (Idle Only) */}
                    {!isResultView && (
                        <motion.div layoutId="verify-header" className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs font-mono tracking-widest uppercase mb-2">
                                <ShieldAlert size={14} />
                                Identity Verification Protocol
                            </div>
                            <h1 className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40">
                                Verify Candidate
                            </h1>
                            <p className="text-lg text-white/50 max-w-md mx-auto">
                                Upload a resume to cross-reference claims against actual GitHub activity.
                            </p>
                        </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                            <AlertCircle className="inline-block mr-2" size={16} />
                            {error}
                        </motion.div>
                    )}

                    {/* Main Form */}
                    <div className={`grid gap-4 ${isResultView ? 'grid-cols-1 md:grid-cols-[1fr_1fr_auto] items-end' : 'grid-cols-1'}`}>

                        {/* File Input */}
                        <div className="space-y-2">
                            {isResultView && <label className="text-xs text-white/40 uppercase font-bold pl-1">Target File</label>}
                            {isResultView ? (
                                <div className="h-14 bg-white/5 border border-white/10 rounded-xl flex items-center px-4 gap-3 text-sm text-white/80 cursor-default">
                                    <FileText className="text-neon-cyan" size={18} />
                                    <span className="truncate">{file?.name}</span>
                                    <button onClick={() => { setResult(null); setFile(null); }} className="ml-auto text-xs text-neon-cyan hover:underline">RESET</button>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                    <div className="relative bg-obsidian-900 border border-white/10 rounded-xl overflow-hidden p-1">
                                        <UploadDropzone
                                            onFileSelect={setFile}
                                            selectedFile={file}
                                            onClear={() => setFile(null)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Username Input */}
                        <div className="space-y-2">
                            {isResultView && <label className="text-xs text-white/40 uppercase font-bold pl-1">GitHub Target</label>}
                            <div className="relative h-14">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="github_username"
                                    className="w-full h-full bg-white/5 border border-white/10 rounded-xl px-4 pl-12 text-white placeholder-white/20 focus:border-neon-cyan focus:bg-white/10 outline-none transition-all font-mono"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    <Search size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleVerify}
                            disabled={processingStep !== 'idle' || !file || !username}
                            className={`h-14 bg-neon-cyan text-obsidian-950 font-bold rounded-xl px-8 flex items-center justify-center gap-2 hover:bg-neon-cyan/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,242,234,0.3)] hover:shadow-[0_0_30px_rgba(0,242,234,0.5)] ${isResultView ? '' : 'w-full text-lg uppercase tracking-wider'}`}
                        >
                            {processingStep !== 'idle' ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <span>{isResultView ? 'Retry' : 'Run Verification'}</span>
                                    {!isResultView && <ArrowUpRight size={20} />}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Processing Steps (Initial View Only) */}
                    <AnimatePresence>
                        {processingStep !== 'idle' && !isResultView && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
                                    {steps.map((step, idx) => {
                                        const isActive = step.id === processingStep;
                                        const isCompleted = steps.findIndex(s => s.id === processingStep) > idx;

                                        return (
                                            <div key={step.id} className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isActive ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' :
                                                    isCompleted ? 'border-green-500 text-green-500 bg-green-500/10' :
                                                        'border-white/10 text-white/20'
                                                    }`}>
                                                    {isActive ? <Loader2 size={14} className="animate-spin" /> : isCompleted ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm font-medium ${isActive || isCompleted ? 'text-white' : 'text-white/40'}`}>{step.label}</div>
                                                    <div className="text-xs text-white/30 font-mono">{step.sub}</div>
                                                </div>
                                                {isActive && <div className="text-xs text-neon-cyan animate-pulse">PROCESSING...</div>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div >
    );
};
