import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    MessagesSquare,
    TrendingUp, ArrowRight, Activity, Zap, Layers
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import { useProfile } from '../hooks/useProfile';

const QuickActions = [
    { label: 'Profile Analysis', path: '/analyze', icon: Zap, color: 'text-neon-cyan', border: 'group-hover:border-neon-cyan/50', bg: 'group-hover:bg-neon-cyan/10' },
    { label: 'Interrogation', path: '/interview/setup', icon: MessagesSquare, color: 'text-neon-red', border: 'group-hover:border-neon-red/50', bg: 'group-hover:bg-neon-red/10' },
    { label: 'View Growth', path: '/growth', icon: TrendingUp, color: 'text-neon-amber', border: 'group-hover:border-neon-amber/50', bg: 'group-hover:bg-neon-amber/10' },
];

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useProfile();
    const [readiness, setReadiness] = React.useState<{ score: number, history: any[] } | null>(null);
    const [latestInterview, setLatestInterview] = React.useState<any>(null);

    React.useEffect(() => {
        if (profile) {
            const growth = profile.growthHistory || [];
            const interviewHistory = growth.filter((h: any) => h.metric === 'interview_score');
            const latest = interviewHistory.length > 0 ? interviewHistory[interviewHistory.length - 1] : growth[growth.length - 1];

            if (latest && latest.metric === 'interview_score') {
                setLatestInterview(latest.details);
            }

            // Map real history to chart format
            const chartHistory = growth
                .filter((h: any) => h.metric === 'interview_score' || h.metric === 'resume_verification_full')
                .map((h: any, i: number) => ({
                    name: `Event ${i + 1}`,
                    score: h.value || 0
                }));

            setReadiness({
                score: latest ? (latest.value || 0) : 0,
                history: chartHistory
            });
        }
    }, [profile]);


    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Hero Section */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-3xl border border-white/5 bg-obsidian-925/80 p-8 md:p-12 text-center md:text-left shadow-2xl group"
            >
                {/* Animated Background Mesh */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-neon-cyan/20 blur-[80px] rounded-full group-hover:bg-neon-cyan/30 transition-all duration-1000" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-neon-purple/20 blur-[80px] rounded-full group-hover:bg-neon-purple/30 transition-all duration-1000" />

                <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center">
                    <div className="md:col-span-2 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-neon-cyan">
                            <Zap size={12} className="fill-current" />
                            <span>SYSTEM READY</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
                            Prove your worth.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-purple animate-shimmer bg-[length:200%_auto]">
                                Eliminate the doubt.
                            </span>
                        </h1>
                        <p className="text-lg text-white/50 max-w-xl leading-relaxed">
                            The definitive engineering truth engine. Verify claims, analyze code patterns, and simulate interrogation scenarios.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-4">
                            <button
                                onClick={() => navigate('/interview/setup')}
                                className="group relative px-8 py-4 bg-neon-cyan text-obsidian-950 font-bold rounded-xl overflow-hidden transition-transform hover:scale-105 active:scale-95"
                            >
                                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative flex items-center gap-2">
                                    <MessagesSquare size={20} />
                                    Start Interrogation
                                </span>
                            </button>
                            <button
                                onClick={() => navigate('/analyze')}
                                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <Activity size={20} />
                                Start Profile Analysis
                            </button>
                        </div>
                    </div>

                    {/* Hero Graphic / Stats */}
                    <div className="hidden md:block relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 blur-2xl rounded-full opacity-50" />
                        <div className="relative bg-obsidian-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-mono text-white/40">LATEST_VERDICT</span>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>
                            </div>
                            <div className="space-y-3 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="text-white/60">Technical Accuracy</span>
                                    <span className="text-neon-cyan">{latestInterview?.breakdown?.accuracy || 0}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div className="h-full bg-neon-cyan" style={{ width: `${latestInterview?.breakdown?.accuracy || 0}%` }} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Communication Depth</span>
                                    <span className="text-neon-purple">{latestInterview?.breakdown?.communication || 0}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div className="h-full bg-neon-purple" style={{ width: `${latestInterview?.breakdown?.communication || 0}%` }} />
                                </div>
                                <div className="pt-2 text-white/80 border-t border-white/5 mt-2 line-clamp-2 italic">
                                    "{latestInterview?.feedback || "System waiting for your first interrogation."}"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Readiness Chart Card */}
                <motion.div
                    variants={itemVariants}
                    className="md:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col"
                >
                    <div className="flex justify-between items-start mb-6 z-10">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Activity className="text-neon-cyan" size={20} />
                                Readiness Trajectory
                            </h2>
                            <p className="text-white/40 text-sm mt-1">Live performance metrics from recent sessions.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-mono font-bold text-neon-cyan drop-shadow-[0_0_10px_rgba(0,242,234,0.3)]">
                                {readiness ? readiness.score : 0}
                            </div>
                            <div className="text-xs text-white/40 uppercase tracking-widest">Current Level</div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[200px] w-full z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={readiness?.history || []}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f2ea" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00f2ea" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" hide />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#00f2ea' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#00f2ea"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Quick Actions Grid */}
                <div className="space-y-4">
                    {QuickActions.map((action) => (
                        <motion.button
                            key={action.path}
                            variants={itemVariants}
                            onClick={() => navigate(action.path)}
                            className={`group w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 transition-all duration-300 relative overflow-hidden ${action.bg} ${action.border}`}
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-black/40 ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                                        <action.icon size={20} />
                                    </div>
                                    <span className="font-semibold text-white/90 group-hover:text-white transition-colors">{action.label}</span>
                                </div>
                                <ArrowRight size={18} className="text-white/20 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
                            </div>
                        </motion.button>
                    ))}

                    {/* Mini Widget */}
                    <motion.div variants={itemVariants} className="p-4 rounded-xl border border-dashed border-white/10 bg-white/5 flex items-center justify-center gap-3 text-white/40 hover:text-white/60 hover:border-white/20 transition-all cursor-not-allowed">
                        <Layers size={18} />
                        <span className="text-sm font-mono">ADD WIDGET +</span>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
