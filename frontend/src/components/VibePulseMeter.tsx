import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, MessageSquare, Clock } from 'lucide-react';

interface VibePulseProps {
    clarity: number;
    confidence: number;
    brevity: number;
}

export const VibePulseMeter: React.FC<VibePulseProps> = ({ clarity, confidence, brevity }) => {
    const metrics = [
        { label: 'Clarity', value: clarity, icon: <MessageSquare size={12} />, color: 'bg-neon-teal' },
        { label: 'Confidence', value: confidence, icon: <Zap size={12} />, color: 'bg-neon-cyan' },
        { label: 'Brevity', value: brevity, icon: <Clock size={12} />, color: 'bg-neon-purple' }
    ];

    return (
        <div className="glass-panel rounded-xl p-5 border border-white/10 relative overflow-hidden group">
            {/* Ambient pulse effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 rounded-full blur-2xl group-hover:bg-neon-teal/10 transition-colors duration-700" />

            <div className="flex justify-between items-center mb-4 relative z-10">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={14} className="text-neon-teal animate-pulse" />
                    Live Vibe Analysis
                </h3>
                <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-neon-teal animate-ping" />
                    <div className="w-1 h-1 rounded-full bg-neon-teal opacity-50" />
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {metrics.map((m, i) => (
                    <div key={m.label} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-white/60 tracking-wider">
                            <span className="flex items-center gap-1.5 transition-colors group-hover:text-white">
                                {m.icon} {m.label}
                            </span>
                            <span className="font-mono">{Math.round(m.value)}%</span>
                        </div>
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.value}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 10, delay: i * 0.1 }}
                                className={`h-full ${m.color} shadow-[0_0_8px_currentColor] relative`}
                            >
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50" />
                            </motion.div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-[9px] text-white/20 text-center pt-3 border-t border-white/5 mt-4 italic font-mono">
                Analyzed from keystroke dynamics & sentiment
            </div>
        </div>
    );
};
