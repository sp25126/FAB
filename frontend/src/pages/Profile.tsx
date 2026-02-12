import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Briefcase, Award, Target, Edit2, Save, Star, Github, Code, GitBranch, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useProfile } from '../hooks/useProfile';

export const Profile: React.FC = () => {
    const { profile, loading: profileLoading, updateProfile, username: sessionUsername } = useProfile();
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    // Interactivity State
    const [activeTab, setActiveTab] = useState<'intel' | 'dossier' | 'matrix'>('intel');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProject, setExpandedProject] = useState<number | null>(null);

    const username = sessionUsername || 'user';

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfile(formData);
            setEditing(false);
        } catch (e) {
            console.error("Failed to save profile", e);
        } finally {
            setLoading(false);
        }
    };

    if (profileLoading && !profile) return <div className="p-8 text-center text-white/40">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">Failed to load profile. Please refresh.</div>;

    // --- Derived Intelligence ---
    const allProjects = profile.projects || [];
    const totalStars = allProjects.reduce((acc: number, p: any) => acc + (p.stars || 0), 0);

    const languages = allProjects.reduce((acc: Record<string, number>, p: any) => {
        if (p.language) acc[p.language] = (acc[p.language] || 0) + 1;
        return acc;
    }, {});
    const topLanguages = Object.entries(languages)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3);

    const githubProjects = allProjects.filter((p: any) => p.stars !== undefined);
    const fabProjects = allProjects.filter((p: any) => p.score !== undefined);

    // --- Interactivity Logic ---
    const filteredProjects = allProjects.filter((p: any) => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (p.name || p.title || '').toLowerCase().includes(query);
        const descMatch = (p.description || p.feedback || '').toLowerCase().includes(query);
        const techMatch = (p.techStack || []).some((t: string) => t.toLowerCase().includes(query));
        return nameMatch || descMatch || techMatch;
    }).sort((a: any, b: any) => {
        const dateA = new Date(a.lastUpdate || a.completedAt || 0).getTime();
        const dateB = new Date(b.lastUpdate || b.completedAt || 0).getTime();
        return dateB - dateA;
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-display font-bold mb-2">Operative Profile</h1>
                    <p className="text-white/60 font-mono text-sm">ID: {username.toUpperCase()}</p>
                </div>
                <button
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${editing
                        ? 'bg-neon-teal text-black hover:bg-neon-teal/90'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                    ) : (
                        editing ? <Save size={16} /> : <Edit2 size={16} />
                    )}
                    {loading ? 'Saving...' : (editing ? 'Save Changes' : 'Edit Profile')}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 gap-8">
                {[
                    { id: 'intel', label: 'Engineering Intel', icon: Target },
                    { id: 'dossier', label: 'Engineering Dossier', icon: Briefcase },
                    { id: 'matrix', label: 'Skill Matrix', icon: Award }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 pb-4 pt-2 border-b-2 transition-all text-sm font-bold uppercase tracking-wider ${activeTab === tab.id
                            ? 'border-neon-teal text-neon-teal'
                            : 'border-transparent text-white/40 hover:text-white/60'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'intel' && (
                    <motion.div
                        key="intel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Main Info Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="md:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <User size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col md:flex-row gap-8">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-neon-teal/20 shadow-lg relative bg-black/50">
                                            {profile.avatarUrl ? (
                                                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neon-teal">
                                                    <User size={48} />
                                                </div>
                                            )}
                                        </div>
                                        {profile.githubUrl && (
                                            <a
                                                href={profile.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-4 block text-center text-xs text-neon-cyan hover:underline"
                                            >
                                                View on GitHub ↗
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <label className="text-white/40 text-xs uppercase font-bold block mb-2">Real Name</label>
                                            <p className="text-xl font-bold text-white">{profile.name || username}</p>
                                        </div>

                                        <div>
                                            <label className="text-white/40 text-xs uppercase font-bold block mb-2">Bio / Mission Statement</label>
                                            {editing ? (
                                                <div className="space-y-4">
                                                    <textarea
                                                        value={formData.bio || ''}
                                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-teal outline-none h-24"
                                                        placeholder="Enter your professional summary..."
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <p className="text-lg leading-relaxed text-white/90 italic">
                                                        "{profile.bio || "No bio set. Click edit to add your mission statement."}"
                                                    </p>
                                                    {profile.resume?.summary && (
                                                        <div className="bg-white/5 p-4 rounded-lg border-l-2 border-neon-cyan">
                                                            <label className="text-neon-cyan/50 text-[10px] uppercase font-bold block mb-1">Unified Analysis Summary</label>
                                                            <p className="text-sm text-white/70 leading-relaxed">{profile.resume.summary}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-white/40 text-xs uppercase font-bold block mb-2">Experience Level</label>
                                                {editing ? (
                                                    <select
                                                        value={formData.experienceLevel || 'Junior'}
                                                        onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-teal outline-none"
                                                    >
                                                        <option value="Junior">Junior</option>
                                                        <option value="Mid">Mid-Level</option>
                                                        <option value="Senior">Senior</option>
                                                        <option value="Lead">Lead / Architect</option>
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-neon-cyan font-bold">
                                                        <Briefcase size={16} />
                                                        {profile.experienceLevel || 'Junior'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-xs uppercase font-bold block mb-2">Target Role</label>
                                                {editing ? (
                                                    <input
                                                        type="text"
                                                        value={formData.targetRole || ''}
                                                        onChange={e => setFormData({ ...formData, targetRole: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-teal outline-none"
                                                        placeholder="e.g. Frontend Engineer"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-white font-bold">
                                                        <Target size={16} />
                                                        {profile.targetRole || 'Software Engineer'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Stat Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="glass-panel p-6 rounded-2xl flex flex-col justify-between"
                            >
                                <div>
                                    <h3 className="text-white/40 text-xs uppercase font-bold mb-4">Engineering Reach</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center group/stat">
                                            <span className="flex items-center gap-2 text-white/70">
                                                <Star size={14} className="group-hover/stat:text-yellow-400 transition-colors" />
                                                GitHub Stars
                                            </span>
                                            <span className="font-mono font-bold text-yellow-400">{totalStars}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/stat">
                                            <span className="flex items-center gap-2 text-white/70">
                                                <Github size={14} className="group-hover/stat:text-neon-cyan transition-colors" />
                                                Public Repos
                                            </span>
                                            <span className="font-mono font-bold text-neon-cyan">{githubProjects.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/stat">
                                            <span className="flex items-center gap-2 text-white/70">
                                                <Award size={14} className="group-hover/stat:text-neon-teal transition-colors" />
                                                FAB Score
                                            </span>
                                            <span className="font-mono font-bold text-neon-teal">
                                                {profile.growthHistory?.filter((h: any) => h.metric === 'interview_score').pop()?.value || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <div className="space-y-3">
                                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Top Stack</div>
                                        <div className="flex flex-wrap gap-2">
                                            {topLanguages.length > 0 ? topLanguages.map(([lang]) => (
                                                <span key={lang} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">
                                                    {lang}
                                                </span>
                                            )) : <span className="text-[10px] text-white/20 italic">No data</span>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Analysis Insights & Recommendations */}
                        {profile.analysis && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-neon-teal/50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Award size={20} className="text-neon-teal" />
                                            <h3 className="font-bold text-white">Core Strengths</h3>
                                        </div>
                                        {profile.analysis.strengths.length > 0 ? (
                                            <ul className="space-y-3">
                                                {profile.analysis.strengths.slice(0, 5).map((s: string, i: number) => (
                                                    <li key={i} className="text-sm text-white/70 flex gap-2">
                                                        <span className="text-neon-teal mt-1">●</span>
                                                        <span>{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-white/30 italic text-sm">No analysis data available.</p>}
                                    </div>
                                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-neon-purple/50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Target size={20} className="text-neon-purple" />
                                            <h3 className="font-bold text-white">Growth Areas</h3>
                                        </div>
                                        {profile.analysis.gaps.length > 0 ? (
                                            <ul className="space-y-3">
                                                {profile.analysis.gaps.slice(0, 5).map((g: string, i: number) => (
                                                    <li key={i} className="text-sm text-white/70 flex gap-2">
                                                        <span className="text-neon-purple mt-1">●</span>
                                                        <span>{g}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-white/30 italic text-sm">No analysis data available.</p>}
                                    </div>
                                </div>

                                {profile.analysis.recommendations && profile.analysis.recommendations.length > 0 && (
                                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-yellow-500/50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Target size={20} className="text-yellow-500" />
                                            <h3 className="font-bold text-white">Mission Objectives (Recommendations)</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {profile.analysis.recommendations.slice(0, 4).map((r: string, i: number) => (
                                                <div key={i} className="bg-white/5 p-3 rounded border border-white/5 flex gap-3">
                                                    <span className="text-yellow-500 font-bold block mt-0.5">{i + 1}.</span>
                                                    <p className="text-sm text-white/80">{r}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GitHub Intelligence Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-panel p-6 rounded-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Code className="text-neon-cyan" size={20} />
                                    <h3 className="font-bold">Primary Languages</h3>
                                </div>
                                <div className="space-y-4">
                                    {topLanguages.map(([lang, count]) => (
                                        <div key={lang}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-white/70">{lang}</span>
                                                <span className="text-white/40">{Math.round((count as number / (allProjects.length || 1)) * 100)}%</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-neon-cyan/60"
                                                    style={{ width: `${(count as number / (allProjects.length || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <GitBranch className="text-neon-purple" size={20} />
                                    <h3 className="font-bold">Project Distribution</h3>
                                </div>
                                <div className="flex items-center justify-around h-[80px]">
                                    <div className="text-center">
                                        <div className="text-2xl font-mono font-bold text-white">{githubProjects.length}</div>
                                        <div className="text-[10px] text-white/30 uppercase">Open Source</div>
                                    </div>
                                    <div className="w-px h-12 bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-mono font-bold text-white">{fabProjects.length}</div>
                                        <div className="text-[10px] text-white/30 uppercase">Assessments</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div >
                )}

                {
                    activeTab === 'dossier' && (
                        <motion.div
                            key="dossier"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Search and Filters */}
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, tech, or mission..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-neon-teal outline-none transition-all"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all">
                                    <Filter size={18} />
                                    <span>Filter</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {filteredProjects.length === 0 ? (
                                    <div className="glass-panel p-12 text-center">
                                        <p className="text-white/40">No matching records found in engineering dossier.</p>
                                    </div>
                                ) : (
                                    filteredProjects.map((p: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            layout
                                            className={`glass-panel border-white/5 overflow-hidden transition-all duration-300 ${expandedProject === i ? 'ring-1 ring-neon-teal/30' : ''}`}
                                        >
                                            <div
                                                className="p-6 cursor-pointer hover:bg-white/[0.02] flex justify-between items-center"
                                                onClick={() => setExpandedProject(expandedProject === i ? null : i)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${p.stars !== undefined ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-teal/10 text-neon-teal'}`}>
                                                        {p.stars !== undefined ? <Github size={20} /> : <Award size={20} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg">{p.name || p.title}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/5 uppercase">
                                                                {p.stars !== undefined ? 'GitHub Source' : 'FAB Assessment'}
                                                            </span>
                                                            {p.language && <span className="text-xs text-white/30 tracking-tight">{p.language}</span>}
                                                            {p.score && <span className="text-xs text-neon-teal font-mono tracking-tight">Score: {p.score}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {p.stars !== undefined && (
                                                        <div className="hidden md:flex items-center gap-3 text-sm text-white/40">
                                                            <div className="flex items-center gap-1.5"><Star size={14} />{p.stars}</div>
                                                            <div className="flex items-center gap-1.5"><GitBranch size={14} />{p.forks || 0}</div>
                                                        </div>
                                                    )}
                                                    {expandedProject === i ? <ChevronUp size={20} className="text-white/20" /> : <ChevronDown size={20} className="text-white/20" />}
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {expandedProject === i && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-white/5"
                                                    >
                                                        <div className="p-6 bg-white/[0.01] space-y-6">
                                                            <div>
                                                                <h5 className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Project Overview</h5>
                                                                <p className="text-sm text-white/60 leading-relaxed">
                                                                    {p.description || p.feedback || "Detailed intelligence logs pending for this operative entry."}
                                                                </p>
                                                            </div>

                                                            {p.techStack && p.techStack.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-3">Technology Arsenal</h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {p.techStack?.map((t: string) => (
                                                                            <span key={t} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">
                                                                                {t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap gap-4 pt-2">
                                                                {p.complexity && (
                                                                    <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">
                                                                        <div className="text-[10px] text-white/30 uppercase font-bold">Complexity</div>
                                                                        <div className="text-xs text-neon-cyan font-mono">{p.complexity}</div>
                                                                    </div>
                                                                )}
                                                                {p.architecture && (
                                                                    <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">
                                                                        <div className="text-[10px] text-white/30 uppercase font-bold">Architecture</div>
                                                                        <div className="text-xs text-white/80 font-mono">{p.architecture}</div>
                                                                    </div>
                                                                )}
                                                                {p.lastUpdate && (
                                                                    <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">
                                                                        <div className="text-[10px] text-white/30 uppercase font-bold">Last Active</div>
                                                                        <div className="text-xs text-white/80 font-mono">{new Date(p.lastUpdate).toLocaleDateString()}</div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="pt-4 flex justify-end">
                                                                {p.stars !== undefined ? (
                                                                    <a
                                                                        href={`#`}
                                                                        className="text-xs text-neon-cyan hover:underline flex items-center gap-1.5 font-bold"
                                                                    >
                                                                        View Intel Logs ↗
                                                                    </a>
                                                                ) : (
                                                                    <button className="text-xs text-neon-teal hover:underline flex items-center gap-1.5 font-bold">
                                                                        Review Assessment Details ↗
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )
                }

                {
                    activeTab === 'matrix' && (
                        <motion.div
                            key="matrix"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="glass-panel p-8 rounded-2xl"
                        >
                            <h3 className="text-xl font-bold mb-6">Technical Skill Matrix</h3>
                            {Object.keys(profile.skills || {}).length === 0 ? (
                                <p className="text-white/40 text-center py-12">Operator skills matrix is empty. Complete live fire assessments to populate.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Object.entries(profile.skills).map(([skill, level]) => (
                                        <div key={skill} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-bold text-white/80 group-hover:text-neon-cyan transition-colors">{skill}</span>
                                                <span className="text-xs font-mono text-white/40">{level}% Maturity</span>
                                            </div>
                                            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${level}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className="h-full bg-gradient-to-r from-neon-teal to-neon-cyan shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                                                />
                                            </div>
                                            <div className="mt-2 text-[10px] text-white/20 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                Operator Proficiency: {level > 80 ? 'Master' : level > 50 ? 'Adept' : 'Initiate'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};
