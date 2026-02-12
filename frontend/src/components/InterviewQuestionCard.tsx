import React from 'react';
import { motion } from 'framer-motion';
import { FileCode, CheckCircle2 } from 'lucide-react';

interface QuestionProps {
    text: string;
    type?: string;
    context?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    interviewerIdentity?: {
        name: string;
        role: string;
        tone: string;
    };
}

const PERSONA_THEMES: Record<string, { color: string, border: string, bg: string }> = {
    "FAB Manager": { color: "text-neon-red", border: "border-neon-red/30", bg: "bg-neon-red/5" },
    "FAB Architect": { color: "text-neon-teal", border: "border-neon-teal/30", bg: "bg-neon-teal/5" },
    "FAB Product": { color: "text-neon-cyan", border: "border-neon-cyan/30", bg: "bg-neon-cyan/5" },
    "FAB Operations": { color: "text-neon-purple", border: "border-neon-purple/30", bg: "bg-neon-purple/5" }
};

export const InterviewQuestionCard: React.FC<QuestionProps> = ({ text, type, context, difficulty = 'MEDIUM', interviewerIdentity }) => {
    const theme = PERSONA_THEMES[interviewerIdentity?.name || ''] || { color: "text-white/40", border: "border-white/10", bg: "bg-white/5" };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            key={text}
            className={`glass-panel border ${theme.border} bg-gradient-to-br from-obsidian-950 to-obsidian-900 rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-2xl group`}
        >
            {/* Ambient Background Glow */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20 ${theme.bg.replace('bg-', 'bg-')}`} />
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                <FileCode size={180} />
            </div>

            {/* Header: Metadata & Persona */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border backdrop-blur-md shadow-inner ${difficulty === 'HARD' ? 'bg-neon-red/10 text-neon-red border-neon-red/20 shadow-neon-red/5' :
                        difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5' :
                            'bg-neon-teal/10 text-neon-teal border-neon-teal/20 shadow-neon-teal/5'
                        }`}>
                        {difficulty}
                    </span>
                    {type && (
                        <span className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[10px] text-white/50 font-mono uppercase tracking-wider flex items-center gap-2">
                            <FileCode size={12} /> {type.replace('_', ' ')}
                        </span>
                    )}
                </div>

                {interviewerIdentity && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 px-4 py-2 rounded-full border ${theme.border} ${theme.bg} backdrop-blur-xl`}
                    >
                        <div className="text-right">
                            <div className={`text-xs font-bold uppercase tracking-widest ${theme.color}`}>
                                {interviewerIdentity.name}
                            </div>
                            <div className="text-[9px] text-white/40 uppercase font-mono">
                                {interviewerIdentity.role}
                            </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${theme.color.replace('text-', 'bg-')} animate-pulse`} />
                    </motion.div>
                )}
            </div>

            {/* Question Text */}
            <h2 className="text-2xl md:text-4xl font-display font-medium leading-snug mb-8 relative z-10 text-white/95">
                {text}
            </h2>

            {/* Context/Reasoning */}
            {context && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`relative z-10 mt-6 p-5 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm`}
                >
                    <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1 rounded-sm ${theme.bg}`}>
                            <div className={`w-1 h-4 rounded-full ${theme.color.replace('text-', 'bg-')}`} />
                        </div>
                        <div className="text-sm text-white/60 leading-relaxed font-mono">
                            <span className="opacity-40 uppercase text-[10px] tracking-widest block mb-1">Context</span>
                            "{context}"
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Status Footer */}
            <div className="mt-10 flex items-center justify-between text-[10px] font-mono text-white/20 border-t border-white/5 pt-6">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-ping ${difficulty === 'HARD' ? 'bg-neon-red' : 'bg-neon-teal'}`} />
                    <span className="tracking-widest">NEURAL LINK: ENCRYPTED • LATENCY: 12ms</span>
                </div>
                <span className="flex items-center gap-1.5 tracking-widest text-white/30">
                    <CheckCircle2 size={10} />
                    AI AGENT ACTIVE
                </span>
            </div>
        </motion.div>
    );
};
