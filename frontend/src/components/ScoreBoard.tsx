import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Shield, Brain, Sparkles, Award, Target } from 'lucide-react';

interface ScoreBoardProps {
    scores: {
        honesty: number;
        depth: number;
        breadth: number;
        experience: number;
        readiness: number;
    };
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores }) => {
    const radarData = [
        { dimension: 'Honesty', value: scores.honesty, icon: Shield },
        { dimension: 'Depth', value: scores.depth, icon: Brain },
        { dimension: 'Breadth', value: scores.breadth, icon: Sparkles },
        { dimension: 'Experience', value: scores.experience, icon: Award },
    ];

    const getScoreColor = (score: number) => {
        if (score >= 71) return 'text-green-400';
        if (score >= 41) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 71) return 'bg-green-500/10 border-green-500/30';
        if (score >= 41) return 'bg-yellow-500/10 border-yellow-500/30';
        return 'bg-red-500/10 border-red-500/30';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return 'Exceptional';
        if (score >= 75) return 'Strong';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Needs Work';
    };

    return (
        <div className="space-y-6">
            {/* Overall Readiness Score */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-400 mb-1">Overall Readiness</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {scores.readiness}
                            </h2>
                            <span className="text-2xl text-slate-400">/100</span>
                        </div>
                        <p className={`mt-2 text-sm font-medium ${getScoreColor(scores.readiness)}`}>
                            {getScoreLabel(scores.readiness)}
                        </p>
                    </div>
                    <Target className="w-24 h-24 text-blue-500/20" />
                </div>
            </motion.div>

            {/* Radar Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10"
            >
                <h3 className="text-lg font-semibold mb-4">Skill Dimensions</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                        />
                        <Radar
                            name="Score"
                            dataKey="value"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 12px'
                            }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                            itemStyle={{ color: '#3b82f6' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Individual Scores Grid */}
            <div className="grid grid-cols-2 gap-4">
                {radarData.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.dimension}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            className={`p-4 rounded-xl border ${getScoreBgColor(item.value)}`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-300">{item.dimension}</span>
                                </div>
                                <span className={`text-2xl font-bold ${getScoreColor(item.value)}`}>
                                    {item.value}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value}%` }}
                                    transition={{ duration: 1, delay: 0.3 + index * 0.05, ease: 'easeOut' }}
                                    className={`h-full ${item.value >= 71
                                            ? 'bg-gradient-to-r from-green-500 to-green-400'
                                            : item.value >= 41
                                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                                                : 'bg-gradient-to-r from-red-500 to-red-400'
                                        }`}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                {getScoreLabel(item.value)}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Score Legend */}
            <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-slate-400">0-40: Needs Work</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-slate-400">41-70: Fair/Good</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-slate-400">71-100: Strong/Exceptional</span>
                </div>
            </div>
        </div>
    );
};
