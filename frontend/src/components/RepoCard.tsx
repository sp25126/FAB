import React, { useState } from 'react';
import { Star, Code, ChevronDown, ChevronUp } from 'lucide-react';

interface RepoProps {
    name: string;
    description: string;
    language: string;
    stars: number;
    complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
    architecture?: string[]; // e.g., ['MVC', 'Microservices']
    files?: string[];
    learnedSkills?: string[];
}

export const RepoCard: React.FC<RepoProps> = ({ name, description, language, stars, complexity, architecture, files, learnedSkills }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group">
            <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-neon-cyan transition-colors truncate pr-4">{name}</h3>
                    <div className="flex items-center gap-1 text-xs text-white/60 bg-white/5 px-2 py-1 rounded">
                        <Star size={12} className="text-yellow-500 fill-current" />
                        {stars}
                    </div>
                </div>

                <p className="text-sm text-white/60 mb-4 line-clamp-2 h-10">{description || 'No description provided.'}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {language && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {language}
                        </span>
                    )}
                    {complexity && (
                        <span className={`text-xs px-2 py-1 rounded border ${complexity === 'HIGH' ? 'bg-neon-red/10 text-neon-red border-neon-red/20' :
                            complexity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                'bg-green-500/10 text-green-500 border-green-500/20'
                            }`}>
                            {complexity} COMPLEXITY
                        </span>
                    )}
                </div>

                {/* Learned Skills Badges */}
                {learnedSkills && learnedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {learnedSkills.map(skill => (
                            <span key={skill} className="text-[10px] font-bold text-neon-teal bg-neon-teal/10 border border-neon-teal/20 px-1.5 py-0.5 rounded-full">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}

                {/* Logic Anchors / Architecture Badges */}
                {architecture && architecture.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {architecture.map(arch => (
                            <span key={arch} className="text-[10px] uppercase font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                                {arch}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {files && files.length > 0 && (
                <div className="bg-black/20 border-t border-white/5 px-4 py-2">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white transition-colors"
                    >
                        <span>{expanded ? 'Hide' : 'Show'} Core Files</span>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {expanded && (
                        <ul className="mt-2 space-y-1 pb-2">
                            {files.slice(0, 5).map(f => (
                                <li key={f} className="text-[10px] font-mono text-white/50 flex items-center gap-2">
                                    <Code size={10} />
                                    {f}
                                </li>
                            ))}
                            {files.length > 5 && (
                                <li className="text-[10px] text-white/30 italic pl-5">+ {files.length - 5} more...</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
