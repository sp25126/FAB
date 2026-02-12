import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Activity, Github, Database, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppService } from '../api/endpoints';
import { useProfile } from '../hooks/useProfile';
import { useAnalysis } from '../context/AnalysisContext';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    icon: React.ReactNode;
    delay: number;
}

interface BrainIconProps {
    size: number;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { profile, loading: profileLoading, username: sessionUsername } = useProfile();
    const { result: analysisResult } = useAnalysis();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startingInterview, setStartingInterview] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<string>('loading');
    const username = sessionUsername;

    useEffect(() => {
        if (!username && !profileLoading) {
            navigate('/login');
            return;
        }

        if (profile) {
            // Derive stats from profile
            const growth = profile.growthHistory || [];
            const lastInterview = [...growth].reverse().find((g: any) => g.metric === 'interview_score');
            const lastScore = lastInterview ? lastInterview.value : (profile.skills ? Object.values(profile.skills).reduce((a, b) => a + b, 0) / (Object.keys(profile.skills).length || 1) : 0);

            // Real interviews count
            const interviewCount = growth.filter((g: any) => g.metric === 'interview_score').length;

            setStats({
                score: Math.round(lastScore),
                improvement: 0,
                interviews: interviewCount,
                repos: profile.projects?.length || 0,
                ragSize: "Synced"
            });

            // Check analysis status
            if (analysisResult) {
                setAnalysisStatus('complete');
            } else if (username) {
                AppService.getLatestAnalyzerStatus(username.toLowerCase()).then(res => {
                    setAnalysisStatus(res.status);
                }).catch(() => setAnalysisStatus('error'));
            }

            setLoading(false);
        }
    }, [profile, profileLoading, navigate, username, analysisResult]);

    useEffect(() => {
        // Check brain health
        AppService.getBrainConfig().catch(() => navigate('/setup'));
    }, [navigate]);


    const handleStartInterview = () => {
        navigate('/interview/setup');
    };

    if (loading) {
        return <SkeletonDashboard />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-0">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 md:p-8 rounded-2xl border-l-4 border-neon-teal relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity -mr-10 -mt-10 md:mr-0 md:mt-0">
                    <BrainIcon size={200} />
                </div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-mono text-green-500 uppercase tracking-widest">System Online</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome Back, {username}.</h1>
                    <p className="text-gray-400 max-w-lg mb-8 text-sm md:text-base">
                        The Full Stack Autonomous Brain is ready. Your neural growth is tracked. Select a protocol to begin.
                    </p>

                    {analysisStatus !== 'complete' && analysisStatus !== 'loading' && (
                        <div className="mb-8 p-4 bg-neon-red/10 border border-neon-red/30 rounded-xl flex items-center gap-4 animate-pulse">
                            <Activity className="text-neon-red" size={24} />
                            <div className="text-left">
                                <h4 className="text-sm font-bold text-neon-red">Profile Analysis Required</h4>
                                <p className="text-xs text-white/50">You must complete a Deep Profile Analysis before starting an interrogation.</p>
                            </div>
                            <button
                                onClick={() => navigate('/analyze')}
                                className="ml-auto px-4 py-2 bg-neon-red text-white text-xs font-bold rounded-lg hover:bg-neon-red/80 transition-colors"
                            >
                                ANALYZE NOW
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleStartInterview}
                        disabled={startingInterview}
                        className="w-full md:w-auto flex items-center justify-center gap-3 bg-neon-teal/10 hover:bg-neon-teal/20 text-neon-teal border border-neon-teal/50 px-6 py-3 rounded-lg font-mono transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {startingInterview ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 fill-current" />
                        )}
                        {startingInterview ? 'INITIALIZING...' : 'INITIATE_INTERVIEW_PROTOCOL_v2'}
                    </button>
                </div>
            </motion.div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <StatCard
                    title="Current Score"
                    value={`${stats?.score || 0}/100`}
                    change={stats?.improvement > 0 ? `+${stats.improvement}%` : `${stats?.improvement}%`}
                    icon={<Activity className="text-neon-amber" />}
                    delay={0.1}
                />
                <StatCard
                    title="Interviews Completed"
                    value={stats?.interviews?.toString() || "0"}
                    change="Lifetime"
                    icon={<Github className="text-white" />}
                    delay={0.2}
                />
                <StatCard
                    title="RAG Knowledge"
                    value={stats?.ragSize || "0 MB"}
                    change="Optimized"
                    icon={<Database className="text-blue-400" />}
                    delay={0.3}
                />
            </div>
        </div>
    );
};

const SkeletonDashboard = () => (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="h-64 bg-white/5 rounded-2xl border-l-4 border-white/10 relative overflow-hidden">
            <div className="absolute top-6 left-6 w-32 h-4 bg-white/10 rounded"></div>
            <div className="absolute top-16 left-6 w-64 h-8 bg-white/10 rounded"></div>
            <div className="absolute top-32 left-6 w-96 h-4 bg-white/10 rounded"></div>
            <div className="absolute bottom-6 left-6 w-48 h-12 bg-white/10 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-white/5 rounded-xl border border-white/5 p-6">
                    <div className="flex justify-between mb-4">
                        <div className="w-10 h-10 bg-white/10 rounded"></div>
                        <div className="w-16 h-6 bg-white/10 rounded"></div>
                    </div>
                    <div className="w-24 h-8 bg-white/10 rounded mb-2"></div>
                    <div className="w-32 h-4 bg-white/10 rounded"></div>
                </div>
            ))}
        </div>
    </div>
);

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card p-6 rounded-xl relative"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/5 rounded-lg">{icon}</div>
            <span className="text-xs font-mono text-neon-teal/70 px-2 py-1 bg-neon-teal/10 rounded">{change}</span>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-sm text-gray-500 font-mono uppercase">{title}</div>
    </motion.div>
);

const BrainIcon: React.FC<BrainIconProps> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
);

export default Dashboard;
