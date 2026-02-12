import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    score: number;
    satisfaction: number;
    feedback: string;
}

export const ScoreBreakdown: React.FC<Props> = ({ score, satisfaction, feedback }) => {


    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4"
        >
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="font-bold text-sm text-neon-cyan">ANALYSIS</h3>
                <span className="font-mono text-xl font-bold">{score}/100</span>
            </div>

            <div className="space-y-2">
                <Bar label="Technical Accuracy" value={score} max={100} color="bg-blue-500" />
                <Bar label="Communication" value={satisfaction} max={100} color="bg-purple-500" />
                {/* <Bar label="Brutal Truth" value={brutal} max={20} color="bg-neon-red" /> */}
            </div>

            <div className="pt-2 text-sm text-white/80 leading-relaxed bg-black/20 p-3 rounded">
                <span className="text-neon-red font-bold mr-2">FEEDBACK:</span>
                {feedback}
            </div>
        </motion.div>
    );
};

const Bar: React.FC<{ label: string, value: number, max: number, color: string }> = ({ label, value, max, color }) => (
    <div>
        <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>{label}</span>
            <span>{Math.round((value / max) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(value / max) * 100}%` }}
                className={`h-full ${color}`}
            />
        </div>
    </div>
);
