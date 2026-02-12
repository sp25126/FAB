import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Award, Target, Zap, Calendar, Star } from 'lucide-react';
import { ScoreHistoryChart } from '../components/charts/ScoreHistoryChart';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
// import { SkillRadarChart } from '../components/charts/SkillRadarChart';
// import { ProjectImpactChart } from '../components/charts/ProjectImpactChart';
import { AppService } from '../api/endpoints';
import type { InterviewHistoryItem, ActiveChallenge, GrowthHistoryItem } from '../api/endpoints';

import { useProfile } from '../hooks/useProfile';
import { Link } from 'react-router-dom';

interface ScorePoint {
    date: string;
    score: number;
    type: string;
    details?: any;
    displayDate?: string;
}

export const Growth: React.FC = () => {
    const { profile, loading: profileLoading } = useProfile();
    const [history, setHistory] = useState<ScorePoint[]>([]);
    const [skills, setSkills] = useState<Record<string, number>>({});

    // New Data States
    const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
    const [selectedPoint, setSelectedPoint] = useState<ScorePoint | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadGrowthData = async () => {
            if (profile) {
                try {
                    setLoading(true);
                    const [interviews, challenges] = await Promise.all([
                        AppService.getInterviewHistory(profile.username).catch(() => [] as InterviewHistoryItem[]),
                        AppService.getActiveChallenges(profile.username).catch(() => [] as ActiveChallenge[])
                    ]);

                    setInterviewHistory(interviews);
                    setActiveChallenges(challenges);

                    const growth: GrowthHistoryItem[] = profile.growthHistory || [];

                    // Map scores for ScoreHistoryChart format: { date, score, type }
                    const scores = growth
                        .filter((h) => h.metric === 'interview_score')
                        .map((h) => ({
                            date: h.date,
                            score: h.value || 0,
                            type: h.metric,
                            details: h.details
                        }))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    setHistory(scores);
                    // Select the latest point by default
                    if (scores.length > 0) setSelectedPoint(scores[scores.length - 1]);

                    setSkills(profile.skills || {});
                } catch (err) {
                    setError("Unable to load growth data. Please try again.");
                } finally {
                    setLoading(false);
                }
            } else if (!profileLoading) {
                setLoading(false);
            }
        };

        if (profile) loadGrowthData();
    }, [profile, profileLoading]);

    // Memoize stats to avoid recalculation
    const stats = useMemo(() => {
        const currentScore = history.length > 0 ? history[history.length - 1].score : 0;
        const startScore = history.length > 1 ? history[0].score : 0;
        const improvement = currentScore - startScore;
        return { currentScore, improvement };
    }, [history]);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse p-4">
                <div className="h-20 bg-white/5 rounded-xl w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-32 bg-white/5 rounded-xl"></div>
                    <div className="h-32 bg-white/5 rounded-xl"></div>
                    <div className="h-32 bg-white/5 rounded-xl"></div>
                </div>
                <div className="h-64 bg-white/5 rounded-xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center text-white/50">
                <Activity className="mx-auto mb-4 text-red-400" size={48} />
                <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (history.length === 0 && Object.keys(skills).length === 0 && activeChallenges.length === 0) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-display font-bold">Growth Trajectory</h1>
                <div className="p-12 text-center border border-white/10 rounded-xl bg-white/5">
                    <TrendingUp className="mx-auto mb-4 text-white/20" size={48} />
                    <h3 className="text-xl font-bold mb-2">No Data Available</h3>
                    <p className="text-white/40">Complete your first interview or verification to generate a growth trajectory.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold">Growth Dashboard</h1>
                    <p className="text-white/40">Track your interview performance and skill acquisition</p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-white/40 uppercase font-bold tracking-wider">Current Level</div>
                    <div className="text-4xl font-mono text-neon-teal">{stats.currentScore}<span className="text-lg text-white/40">/100</span></div>
                </div>
            </div>

            {/* 1. Active Mission Control (GapCrusher) */}
            {activeChallenges.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neon-cyan/20 text-neon-cyan uppercase tracking-wider animate-pulse">
                                Active Mission
                            </span>
                            <span className="text-white/40 text-xs">Started {new Date(activeChallenges[0].startedAt).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{activeChallenges[0].name}</h2>
                        <p className="text-white/60 max-w-2xl mb-6">{activeChallenges[0].description}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {activeChallenges[0].techStack.map((tech: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-black/40 border border-white/10 rounded text-xs text-neon-cyan font-mono">
                                    {tech}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <Link
                                to={`/project/${activeChallenges[0].id}`}
                                className="px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <Zap size={16} />
                                Continue Mission
                            </Link>
                            <Link
                                to={`/project/${activeChallenges[0].id}`}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-sm flex items-center gap-2 transition-all"
                            >
                                View Roadmap
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                    icon={TrendingUp}
                    title="Total Improvement"
                    value={`${stats.improvement > 0 ? '+' : ''}${stats.improvement}%`}
                    subtext="Since baseline"
                    valueColor={stats.improvement >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <KpiCard
                    icon={Activity}
                    title="Sessions Completed"
                    value={interviewHistory.length}
                    subtext="Interviews & Reviews"
                />
                <KpiCard
                    icon={Award}
                    title="Skills Verified"
                    value={Object.keys(skills).length}
                    subtext="Across all domains"
                    valueColor="text-d946ef"
                />
            </div>

            {/* 2. Interactive Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 space-y-6"
                >
                    {/* Main Growth Chart */}
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <TrendingUp className="text-neon-teal" size={20} />
                                Performance Trajectory
                            </h3>
                            {selectedPoint && (
                                <span className="text-xs font-mono text-neon-teal">
                                    Selected: {new Date(selectedPoint.date).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        <div className="h-80">
                            <ScoreHistoryChart data={history} />
                        </div>

                        {/* Selected Point Details */}
                        <AnimatePresence mode="wait">
                            {selectedPoint && (
                                <motion.div
                                    key={selectedPoint.date}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 pt-4 border-t border-white/10"
                                >
                                    <div className="flex gap-4 items-start">
                                        <div className={`p-3 rounded-lg ${selectedPoint.score >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            <Award size={24} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white mb-1">
                                                {selectedPoint.type === 'interview_score' ? 'Technical Interview' : 'System Verification'}
                                            </div>
                                            <div className="text-3xl font-mono font-bold text-white mb-2">
                                                {selectedPoint.score} <span className="text-sm text-white/40">/ 100</span>
                                            </div>
                                            {selectedPoint.details && (
                                                <p className="text-xs text-white/60">
                                                    {selectedPoint.details.verdict && <span className="block mb-1">Verdict: {selectedPoint.details.verdict}</span>}
                                                    {selectedPoint.details.topics && `Topics: ${selectedPoint.details.topics.join(', ')}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Heatmap */}
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="text-neon-teal" size={20} />
                            <h3 className="font-bold text-lg">Activity Heatmap</h3>
                        </div>
                        <ActivityHeatmap data={profile?.growthHistory || []} />
                    </div>
                </motion.div>

                {/* 3. Interview Battle Logs */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-1 p-6 bg-white/5 rounded-xl border border-white/10 h-fit"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="text-neon-pink" size={20} />
                        <h3 className="font-bold text-lg">Battle Logs</h3>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {interviewHistory.length === 0 ? (
                            <div className="text-center py-8 text-white/30 text-sm">No interviews recorded yet.</div>
                        ) : (
                            interviewHistory.map((session, i) => (
                                <div key={i} className="p-4 bg-black/20 rounded-lg border border-white/5 hover:border-white/20 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs text-white/40 font-mono">
                                            {new Date(session.date).toLocaleDateString()}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${session.score >= 70 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {session.score >= 70 ? 'PASSED' : 'FAILED'}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl font-mono font-bold text-white">
                                            {session.score}
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    className={`${star <= Math.round(session.score / 20) ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {session.topics && session.topics.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {session.topics.slice(0, 3).map((t: string, idx: number) => (
                                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">
                                                    {t}
                                                </span>
                                            ))}
                                            {session.topics.length > 3 && (
                                                <span className="text-[10px] px-1.5 py-0.5 text-white/40">+{session.topics.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    {session.sessionId && (
                                        <Link
                                            to={`/interview/summary/${session.sessionId}`}
                                            className="block w-full text-center py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-neon-teal font-bold transition-colors"
                                        >
                                            View Analysis
                                        </Link>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

// Helper Component for KPI
interface KpiCardProps {
    icon: any;
    title: string;
    value: string | number;
    subtext: string;
    valueColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, title, value, subtext, valueColor = 'text-white' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden group"
    >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={64} />
        </div>
        <h3 className="text-white/40 text-xs font-bold uppercase mb-2">{title}</h3>
        <p className={`text-4xl font-mono font-bold ${valueColor}`}>
            {value}
        </p>
        <p className="text-xs text-white/30 mt-2">{subtext}</p>
    </motion.div>
);
