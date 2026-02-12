import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

interface BrutalTruthPanelProps {
    honestyScore: number;
    claimsFound: number;
    summary?: string;
}

export const BrutalTruthPanel: React.FC<BrutalTruthPanelProps> = ({ honestyScore, claimsFound, summary }) => {
    let status = { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle, label: 'VERIFIED' };

    if (honestyScore < 50) {
        status = { color: 'text-neon-red', bg: 'bg-neon-red/10', border: 'border-neon-red/20', icon: ShieldAlert, label: 'CRITICAL RISK' };
    } else if (honestyScore < 80) {
        status = { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle, label: 'SUSPICIOUS' };
    }

    return (
        <div className={`rounded-xl border ${status.border} ${status.bg} p-6 mb-6`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <status.icon className={status.color} size={24} />
                    <div>
                        <h3 className={`font-bold tracking-wider ${status.color}`}>{status.label}</h3>
                        <p className="text-xs text-white/60">Truth Analysis Protocol</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-4xl font-display font-bold ${status.color}`}>{honestyScore}%</span>
                    <p className="text-xs text-white/40">HONESTY SCORE</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-obsidian-950/50 rounded p-3 text-center border border-white/5">
                    <div className="text-xl font-mono font-bold">{claimsFound}</div>
                    <div className="text-[10px] text-white/40 uppercase">Claims Extracted</div>
                </div>
                {/* Placeholder for other metric */}
                <div className="bg-obsidian-950/50 rounded p-3 text-center border border-white/5">
                    <div className="text-xl font-mono font-bold text-white/60">--</div>
                    <div className="text-[10px] text-white/40 uppercase">Overclaims</div>
                </div>
            </div>

            {summary && (
                <div className="text-sm text-white/80 leading-relaxed border-t border-white/10 pt-4">
                    <span className="font-bold text-white/40 uppercase text-xs block mb-1">Verdict:</span>
                    {summary}
                </div>
            )}
        </div>
    );
};
