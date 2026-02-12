
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckSquare, ExternalLink, ArrowLeft, Trophy, Loader2 } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { AppService } from '../api/endpoints';

interface ProjectRoadmap {
    projectId: string;
    steps: {
        title: string;
        description: string;
        resources: string[];
        acceptanceCriteria: string[];
    }[];
}

export const ProjectRoadmapView: React.FC = () => {
    // In a real app, we'd fetch based on ID. 
    // Since our backend generates it on the fly, we rely on state or localStorage.
    // For now, let's look for navigation state.

    // Actually, to make this work E2E without adding another endpoint right now,
    // let's assume the previous page passed the roadmap via state.

    // EDIT: The prompt asked for "roadmap only if user accepts". 
    // The "Accept" flow returns the JSON. We should probably display it.

    // Let's rely on `useLocation().state`.
    const { projectId } = useParams();
    const { username } = useProfile();
    const navigate = useNavigate();
    const [roadmap, setRoadmap] = useState<ProjectRoadmap | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            if (projectId && username) {
                setLoading(true);
                try {
                    // Try to find in active challenges first
                    const challenges = await AppService.getActiveChallenges(username);
                    const project = challenges.find(p => p.id.toString() === projectId);

                    if (project && project.roadmap) {
                        setRoadmap({
                            projectId: project.id.toString(),
                            steps: project.roadmap.steps || []
                        });
                        return;
                    }

                    // If not found in active, maybe in all projects?
                    // For now, let's just fall back to local storage if API fails or not found
                } catch (e) {
                    console.error("Failed to fetch project:", e);
                } finally {
                    setLoading(false);
                }
            }

            // Fallback to local storage (existing behavior)
            const saved = localStorage.getItem('fab_current_roadmap');
            if (saved) {
                setRoadmap(JSON.parse(saved));
            }
        };

        fetchProject();
    }, [projectId, username]);

    if (loading) return (
        <div className="p-12 text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-neon-teal" size={32} />
            <p className="text-white/60">Loading Mission Data...</p>
        </div>
    );

    if (!roadmap) return (
        <div className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">No Active Project</h2>
            <button
                onClick={() => navigate('/interview/setup')}
                className="text-neon-teal underline hover:text-white"
            >
                Start an interview
            </button> to get a recommendation.
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="bg-gradient-to-r from-neon-teal/10 to-transparent p-8 rounded-2xl border border-neon-teal/20">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-neon-teal font-mono text-xs uppercase font-bold tracking-wider">Active Mission</span>
                        <h1 className="text-3xl font-display font-bold mt-2">Project Execution Roadmap</h1>
                        <p className="text-white/60 mt-2">Follow these steps to complete your challenge.</p>
                    </div>
                    <Trophy className="text-neon-teal" size={48} />
                </div>
            </div>

            <div className="space-y-6">
                {roadmap.steps.map((step, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-panel p-6 rounded-xl border-l-4 border-l-neon-teal/50"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-mono font-bold">
                                {idx + 1}
                            </div>
                            <h3 className="text-xl font-bold">{step.title}</h3>
                        </div>

                        <p className="text-white/80 mb-6 pl-12">{step.description}</p>

                        <div className="pl-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-xs uppercase font-bold text-white/40 mb-3 flex items-center gap-2">
                                    <CheckSquare size={14} /> Acceptance Criteria
                                </h4>
                                <ul className="space-y-2">
                                    {step.acceptanceCriteria.map((ac, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-1.5 block shrink-0" />
                                            {ac}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xs uppercase font-bold text-white/40 mb-3 flex items-center gap-2">
                                    <ExternalLink size={14} /> Recommended Resources
                                </h4>
                                <ul className="space-y-2">
                                    {step.resources.map((res, i) => (
                                        <li key={i} className="text-sm">
                                            <a href={`https://www.google.com/search?q=${encodeURIComponent(res)}`} target="_blank" rel="noreferrer" className="text-neon-teal hover:underline truncate block">
                                                {res}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={async () => {
                        if (username && roadmap && roadmap.projectId) {
                            try {
                                await AppService.completeProject(username, roadmap.projectId);
                                alert("Project marked as complete! Skill matrix updated.");
                                navigate('/profile');
                            } catch (e) {
                                console.error("Failed to complete project", e);
                                alert("Failed to mark project as complete.");
                            }
                        }
                    }}
                    className="bg-neon-teal text-black font-bold py-3 px-8 rounded-lg hover:bg-neon-teal/90 transition-transform hover:scale-105"
                >
                    Mark Project Complete
                </button>
            </div>
        </div>
    );
};
