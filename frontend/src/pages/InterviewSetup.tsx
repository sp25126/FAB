import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainStatusBadge } from '../components/BrainStatusBadge';
import { AppService } from '../api/endpoints';
import { Loader2, Check, ChevronRight, AlertTriangle as WarnIcon } from 'lucide-react';

import { useProfile } from '../hooks/useProfile';
import { useAnalysis } from '../context/AnalysisContext';

export const InterviewSetup: React.FC = () => {
    const navigate = useNavigate();
    const { profile, loading: profileLoading, username: sessionUsername } = useProfile();
    const { result: analysisResult } = useAnalysis();
    const [loading, setLoading] = useState(false);
    const [enableTraining, setEnableTraining] = useState(true);
    const [username, setUsername] = useState('');

    // Prerequisite Check
    const [showPrerequisiteModal, setShowPrerequisiteModal] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<'complete' | 'processing' | 'missing' | 'error'>('missing');

    const [brainType, setBrainType] = useState<'local' | 'remote'>('local');

    React.useEffect(() => {
        if (sessionUsername) {
            setUsername(sessionUsername);
        }
    }, [sessionUsername]);

    React.useEffect(() => {
        // Fetch Brain Config
        AppService.getBrainConfig().then(config => {
            setBrainType(config.brainType);
        }).catch(err => console.error("Failed to fetch brain config:", err));

        const checkStatus = () => {
            if (analysisResult) {
                setAnalysisStatus('complete');
                return;
            }

            if (username) {
                AppService.getLatestAnalyzerStatus(username).then(res => {
                    setAnalysisStatus(res.status as any);
                }).catch(err => console.error("Failed to fetch analysis status:", err));
            }
        };

        checkStatus();
    }, [username, analysisResult]);


    const handleStart = async () => {
        if (!username) return;

        // Enforce Unified Analysis Protocol
        if (analysisStatus !== 'complete') {
            setShowPrerequisiteModal(true);
            return;
        }

        setLoading(true);
        try {
            // Construct Context from Profile + Analysis
            const context = {
                skills: profile?.skills ? Object.keys(profile.skills) : [],
                experience: profile?.experienceLevel || 'Junior',
                bio: profile?.bio || '',
                projects: analysisResult?.github?.projects || [],
                resumeData: analysisResult?.resume || null,
                techTrends: analysisResult?.insights?.recommendations || []
            };

            const res = await AppService.startInterview(username, context, brainType, enableTraining);
            localStorage.setItem('fab_session_id', res.sessionId);
            // Pass first Question via state
            navigate('/interview/live', { state: { firstQuestion: res.firstQuestion } });
        } catch (error: any) {
            console.error("Interview Start Error:", error);

            // Handle Prerequisite Failure Gracefully
            if (error.response && error.response.status === 400 && error.response.data?.code === 'PREREQUISITE_FAILED') {
                setAnalysisStatus('missing');
                setShowPrerequisiteModal(true);
                return;
            }

            alert("Failed to initialize session. Check Brain connection or server logs.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <BrainStatusBadge />
                <h1 className="text-3xl font-display font-bold">Configure Interrogation</h1>
                <p className="text-white/40">Set the parameters for your technical assessment.</p>
            </div>

            <div className="glass-panel p-8 rounded-2xl space-y-8">
                {/* Username */}
                <div>
                    <label className="text-sm font-bold text-white/70 uppercase mb-2 block">Candidate Identity</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-red/50 outline-none"
                    />
                </div>

                {/* Hidden Defaults */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-sm">Adaptive Difficulty</h4>
                            <p className="text-xs text-white/40">AI adjusts to your responses.</p>
                        </div>
                        <button
                            onClick={() => setEnableTraining(!enableTraining)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${enableTraining ? 'bg-neon-teal' : 'bg-white/10'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enableTraining ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Hidden Mode & Count - Hardcoded to BRUTAL & Unlimited */}
                    <div className="hidden">
                        Intensity: BRUTAL
                        Questions: UNLIMITED (Time-boxed)
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={loading || !username}
                    className="w-full bg-neon-red hover:bg-neon-red/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(255,20,20,0.3)] hover:shadow-[0_0_40px_rgba(255,20,20,0.5)] transform hover:-translate-y-1"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'INITIATE INTERROGATION'}
                </button>
            </div>

            {/* Workflow Enforcement Modal for First Time Users */}
            {showPrerequisiteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-obsidian-900 border border-neon-red/50 rounded-2xl p-8 max-w-md w-full space-y-6 text-center shadow-[0_0_50px_rgba(255,20,20,0.2)]">
                        <div className="w-16 h-16 bg-neon-red/20 rounded-full flex items-center justify-center mx-auto">
                            <WarnIcon className="text-neon-red w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold font-display text-white mb-2">Protocol Violation</h2>
                            <p className="text-white/60">
                                First-time candidates must establish a baseline before interrogation.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/analyze')}
                                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-4 transition-all group"
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${analysisStatus === 'complete' ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-white/20 text-white/20'}`}>
                                    {analysisStatus === 'complete' ? <Check className="w-4 h-4" /> : '1'}
                                </div>
                                <div className="text-left">
                                    <span className={analysisStatus === 'complete' ? 'text-white' : 'text-white/60'}>Unified Profile Analysis</span>
                                    <p className="text-[10px] text-white/30">Merge Resume + GitHub into a single technical dossier.</p>
                                </div>
                                <ChevronRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs text-white/30">
                                Complete missing steps to unlock the interrogation chamber.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
