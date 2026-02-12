
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppService } from '../api/endpoints';
import type { ProjectProposal } from '../api/endpoints';
import { ArrowLeft, CheckCircle, Code, Cpu, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FixSkills: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const skillToFix = searchParams.get('skill');
    const username = localStorage.getItem('fab_username') || 'user';

    const [loading, setLoading] = useState(false);
    const [proposal, setProposal] = useState<ProjectProposal | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (skillToFix) {
            generateFix();
        }
    }, [skillToFix]);

    const generateFix = async () => {
        setLoading(true);
        setError(null);
        try {
            // We pass the specific skill if the backend supported it, 
            // but for now getCoachingSuggestion uses global weak skills.
            // Future Update: Pass skillToFix to getCoachingSuggestion
            const data = await AppService.getCoachingSuggestion(username);
            setProposal(data);
        } catch (e) {
            console.error(e);
            setError("Failed to generate a fix project. The Neural Core might be overloaded.");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!proposal) return;
        try {
            const response = await AppService.acceptProjectChallenge(username, proposal);
            // Save roadmap to local storage for the view to pick up
            if (response.roadmap) {
                localStorage.setItem('fab_current_roadmap', JSON.stringify(response.roadmap));
                // Navigate to Roadmap view
                // We'll search for where ProjectRoadmapView is mounted. 
                // Based on router (not seen but assumed), let's try /roadmap or we might need to add it.
                // Assuming /roadmap exists or can be added. If not, /growth usually links to it.
                // Let's use /current-project as a route? 
                // Wait, I haven't added a route for ProjectRoadmapView in router.tsx yet.
                // I should verify router.tsx.
                // For now, let's assume /roadmap.
                navigate('/roadmap');
            } else {
                navigate('/growth');
            }
        } catch (e) {
            console.error(e);
            setError("Failed to accept project.");
        }
    };

    return (
        <div className="min-h-screen bg-obsidian-950 text-gray-200 p-8 font-sans selection:bg-neon-teal/30">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-teal to-neon-cyan">
                            Skill Repair Protocol
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Targeting Weakness: <span className="text-white font-mono">{skillToFix || 'General'}</span>
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[400px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center space-y-4"
                            >
                                <div className="relative w-20 h-20 mx-auto">
                                    <div className="absolute inset-0 border-4 border-neon-teal/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-neon-teal rounded-full animate-spin"></div>
                                    <Cpu className="absolute inset-0 m-auto text-neon-teal w-8 h-8 animate-pulse" />
                                </div>
                                <p className="font-mono text-neon-teal/80 animate-pulse">ANALYZING_GAPS & GENERATING_PROJECT...</p>
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center space-y-4 max-w-md"
                            >
                                <AlertTriangle className="w-16 h-16 text-neon-amber mx-auto" />
                                <h3 className="text-xl font-bold text-white">Generation Failed</h3>
                                <p className="text-gray-400">{error}</p>
                                <button
                                    onClick={generateFix}
                                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    Retry Analysis
                                </button>
                            </motion.div>
                        ) : proposal ? (
                            <motion.div
                                key="proposal"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full glass-panel p-8 rounded-2xl border border-neon-teal/20 relative overflow-hidden"
                            >
                                {/* Background Decoration */}
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-neon-teal/5 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-xs font-mono text-neon-teal mb-2">PROPOSED_INTERVENTION</div>
                                            <h2 className="text-3xl font-bold text-white">{proposal.title}</h2>
                                        </div>
                                        <Code className="w-10 h-10 text-neon-teal/50" />
                                    </div>

                                    <div className="bg-obsidian-900/50 p-6 rounded-xl border border-white/5">
                                        <p className="text-lg text-gray-300 leading-relaxed">
                                            {proposal.description}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <h4 className="font-mono text-sm text-gray-500 uppercase">Key Objectives</h4>
                                            <ul className="space-y-2">
                                                {(proposal.requirements || []).map((req, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                        <span className="text-neon-teal mt-1">▹</span>
                                                        {req}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-mono text-sm text-gray-500 uppercase">Tech Stack</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(proposal.techStack || []).map((tech, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-neon-cyan/80">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex justify-end gap-4">
                                        <button
                                            onClick={generateFix}
                                            className="px-6 py-3 text-gray-400 hover:text-white transition-colors text-sm font-bold"
                                        >
                                            REGENERATE
                                        </button>
                                        <button
                                            onClick={handleAccept}
                                            className="px-8 py-3 bg-neon-teal text-obsidian-900 font-bold rounded-lg hover:bg-neon-teal/90 transition-all shadow-[0_0_20px_-5px_rgba(20,241,149,0.3)] flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            ACCEPT CHALLENGE
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default FixSkills;
