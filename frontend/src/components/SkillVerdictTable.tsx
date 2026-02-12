import { Check, X, HelpCircle } from 'lucide-react';

interface VerificationItem {
    skill: string;
    verdict: 'VERIFIED' | 'WEAK_SUPPORT' | 'OVERCLAIMED' | 'FRAUDULENT';
    githubEvidence: string;
    recommendation: string;
}

interface SkillVerdictTableProps {
    items: VerificationItem[];
    onFix?: (skill: string) => void;
}

export const SkillVerdictTable: React.FC<SkillVerdictTableProps> = ({ items, onFix }) => {
    return (
        <div className="border border-white/10 rounded-xl overflow-hidden bg-obsidian-900/30 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
                <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                        <th className="p-4 font-medium sticky left-0 bg-obsidian-900/90 backdrop-blur-sm z-10">Claim / Skill</th>
                        <th className="p-4 font-medium">Verdict</th>
                        <th className="p-4 font-medium">Evidence</th>
                        <th className="p-4 font-medium text-right sticky right-0 bg-obsidian-900/90 backdrop-blur-sm z-10">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {items.map((item: any, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 font-medium text-white/90 sticky left-0 bg-obsidian-900/30 group-hover:bg-obsidian-800/50 transition-colors">{item.skill || item.claim}</td>
                            <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.verdict === 'VERIFIED'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : item.verdict === 'WEAK_SUPPORT'
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {item.verdict === 'VERIFIED' && <Check size={12} />}
                                    {(item.verdict === 'OVERCLAIMED' || item.verdict === 'FRAUDULENT') && <X size={12} />}
                                    {item.verdict === 'WEAK_SUPPORT' && <HelpCircle size={12} />}
                                    {item.verdict}
                                </span>
                            </td>
                            <td className="p-4 text-white/60 max-w-xs truncate" title={item.githubEvidence}>
                                {item.githubEvidence || "No strong evidence found."}
                            </td>
                            <td className="p-4 text-right sticky right-0 bg-obsidian-900/30 group-hover:bg-obsidian-800/50 transition-colors">
                                {item.verdict !== 'VERIFIED' && (
                                    <button
                                        onClick={() => onFix && onFix(item.skill)}
                                        className="text-neon-cyan hover:text-white text-xs font-bold uppercase transition-colors"
                                    >
                                        Fix This
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-white/30">
                                No claims analyzed yet. Upload a resume to begin.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
