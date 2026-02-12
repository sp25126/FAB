import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// AppService removed, used via context if needed

export const InteractiveAnalyzer: React.FC = () => {
    const location = useLocation();
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [githubToken, setGithubToken] = useState('');

    // Pre-fill from navigation state
    useEffect(() => {
        if (location.state) {
            const { username: initialUser, token: initialToken, feature } = location.state as any;
            if (initialUser) setUsername(initialUser);
            if (initialToken) setGithubToken(initialToken);
            if (feature) setSelectedFeature(feature);
        }
    }, [location.state]);

    const features = [
        {
            id: 'ultra-deep',
            title: '🔬 Ultra-Deep Project Analysis',
            description: 'Analyze ALL files in a project with full architecture, security, and performance insights',
            component: 'UltraDeepAnalyzer'
        },
        {
            id: 'resume-gaps',
            title: '🎯 Resume Gap Finder',
            description: 'Find skills on your resume lacking GitHub proof + get actionable project ideas',
            component: 'ResumeGapAnalyzer'
        },
        {
            id: 'project-compare',
            title: '⚖️ Project Comparison',
            description: 'Compare your projects with each other or benchmark against any external GitHub repo',
            component: 'ProjectComparator'
        },
        {
            id: 'code-quality',
            title: '✨ Code Quality Deep-Dive',
            description: 'Detect code smells, anti-patterns, and get refactoring suggestions',
            component: 'CodeQualityAnalyzer'
        },
        {
            id: 'career-trajectory',
            title: '📈 Career Trajectory',
            description: 'Track your skill evolution, domain shifts, and growth trajectory over time',
            component: 'CareerTrajectoryAnalyzer'
        }
    ];

    const renderFeatureComponent = () => {
        switch (selectedFeature) {
            case 'ultra-deep':
                return <UltraDeepAnalyzer username={username} githubToken={githubToken} onBack={() => setSelectedFeature(null)} />;
            case 'resume-gaps':
                return <ResumeGapAnalyzer username={username} githubToken={githubToken} onBack={() => setSelectedFeature(null)} />;
            case 'project-compare':
                return <ProjectComparator username={username} githubToken={githubToken} onBack={() => setSelectedFeature(null)} />;
            case 'code-quality':
                return <CodeQualityAnalyzer username={username} githubToken={githubToken} onBack={() => setSelectedFeature(null)} />;
            case 'career-trajectory':
                return <CareerTrajectoryAnalyzer username={username} githubToken={githubToken} onBack={() => setSelectedFeature(null)} />;
            default:
                return null;
        }
    };

    if (selectedFeature) {
        return <div className="min-h-screen bg-slate-900 overflow-y-auto">{renderFeatureComponent()}</div>;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4 selection:bg-neon-teal/30">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-neon-teal via-white to-neon-purple bg-clip-text text-transparent">
                        Interactive Analyzer
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto font-light">
                        Deploy specialized AI agents to dissect your technical profile and unlock deep insights.
                    </p>
                </div>

                {/* Credentials Banner */}
                <div className="relative group overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl">🔐</span>
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 bg-neon-teal rounded-full animate-pulse" />
                            <h2 className="text-xl font-bold tracking-wide uppercase text-neon-teal">Identity Context</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">GitHub Identity</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-teal/50 transition-all font-mono"
                                    placeholder="username"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Access Token</label>
                                <input
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-neon-teal/50 transition-all font-mono"
                                    placeholder="ghp_••••••••••••"
                                />
                            </div>
                        </div>

                        {(!username || !githubToken) && (
                            <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-4 py-2 rounded-lg text-sm border border-amber-400/20">
                                <span>⚠️</span>
                                <span>Full access required. Please synchronize your GitHub context above.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature) => (
                        <button
                            key={feature.id}
                            onClick={() => {
                                if (!username || !githubToken) return;
                                setSelectedFeature(feature.id);
                            }}
                            disabled={!username || !githubToken}
                            className={`
                                relative group overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-8 text-left
                                transition-all duration-500 hover:bg-white/[0.07] hover:border-white/20
                                ${!username || !githubToken ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                            `}
                        >
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent group-hover:to-white transition-all">
                                    {feature.title}
                                </h3>
                                <p className="text-white/50 text-sm leading-relaxed mb-6 group-hover:text-white/70 transition-colors">
                                    {feature.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/30 group-hover:text-neon-teal transition-colors">
                                    Initialize Agent
                                    <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>

                            {/* Decorative background accent */}
                            <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-neon-teal/5 rounded-full blur-3xl group-hover:bg-neon-teal/10 transition-colors" />
                        </button>
                    ))}
                </div>

                {/* System Guide */}
                <div className="bg-gradient-to-br from-neon-purple/5 to-transparent border border-white/5 rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-4xl">💡</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold tracking-tight">System Initialization</h3>
                        <p className="text-white/60 max-w-xl font-light">
                            Our agents perform non-destructive read operations to build a high-fidelity model of your technical capabilities.
                        </p>
                    </div>
                    <div className="md:ml-auto grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-xs font-bold text-white/20">
                                0{i}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Mini component imports (will be created next)
import { UltraDeepAnalyzer } from './features/UltraDeepAnalyzer';
import { ResumeGapAnalyzer } from './features/ResumeGapAnalyzer';
import { ProjectComparator } from './features/ProjectComparator';
import { CodeQualityAnalyzer } from './features/CodeQualityAnalyzer';
import { CareerTrajectoryAnalyzer } from './features/CareerTrajectoryAnalyzer';
