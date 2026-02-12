import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Shield, User, BarChart2, Settings,
    Activity, Menu, X, Brain, MessagesSquare, Github, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationItems = [
    { icon: LayoutDashboard, label: 'Mission Control', path: '/' },
    { icon: Shield, label: 'Profile Analyzer', path: '/analyze' }, // NEW: Unified Resume + GitHub
    { icon: MessagesSquare, label: 'Interview', path: '/interview/setup' },
    { icon: BarChart2, label: 'Growth Trajectory', path: '/growth' },
    { icon: User, label: 'Operative Profile', path: '/profile' },
    { icon: Activity, label: 'Diagnostics', path: '/diagnostics' },
    { icon: Settings, label: 'System Settings', path: '/settings' },
];

import { useScrollGlow } from '../hooks/useScrollGlow';
import { useProfile } from '../hooks/useProfile';

export const AppShell: React.FC = () => {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const mainRef = React.useRef<HTMLDivElement>(null);
    const { profile, username } = useProfile();

    useScrollGlow(mainRef);

    return (
        <div className="min-h-screen bg-obsidian text-white flex font-sans selection:bg-neon-cyan selection:text-obsidian-950 overflow-hidden relative">

            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-purple/5 blur-[120px] rounded-full pointer-events-none z-0" />

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-col border-r border-white/5 bg-obsidian-950/80 backdrop-blur-2xl fixed inset-y-0 left-0 z-50 shadow-2xl">
                <div className="h-20 flex items-center px-8 border-b border-white/5 gap-4 relative overflow-hidden group">
                    {/* Logo Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center border border-white/10 relative z-10 box-shadow-neon-cyan">
                        <Brain className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,242,234,0.8)]" size={20} />
                    </div>
                    <div className="flex flex-col relative z-10">
                        <span className="font-display font-bold tracking-widest text-lg text-white">FAB</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">System v2.1</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none">
                    <div className="px-4 py-2 text-xs font-mono text-white/30 uppercase tracking-widest">Main Modules</div>
                    {NavigationItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`group relative flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${isActive
                                    ? 'bg-white/5 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan shadow-[0_0_10px_rgba(0,242,234,0.8)]"
                                    />
                                )}
                                <item.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_rgba(0,242,234,0.5)]' : 'group-hover:scale-105'}`} />
                                <span className="relative z-10">{item.label}</span>
                                {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="p-4 rounded-xl bg-obsidian-900/50 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col gap-2 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                <div className="text-xs font-mono text-white/60">
                                    SYSTEM <span className="text-white font-bold ml-1">ONLINE</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <User size={14} className="text-neon-cyan shrink-0" />
                                    <span className="text-[10px] font-mono text-white/80 truncate">
                                        {profile?.name || profile?.username || username || 'GUEST'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('fab_username');
                                        localStorage.removeItem('fab_token');
                                        localStorage.removeItem('fab_profile');
                                        window.location.href = '/login';
                                    }}
                                    className="text-[10px] uppercase tracking-tighter text-neon-purple hover:text-neon-cyan transition-colors"
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Topbar */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-obsidian-950/80 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neon-cyan/10 rounded-lg flex items-center justify-center border border-neon-cyan/20">
                        <Brain className="text-neon-cyan" size={18} />
                    </div>
                    <span className="font-display font-bold tracking-wider text-lg">FAB</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 text-white/70 active:scale-95 transition-transform"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-obsidian-950/95 backdrop-blur-3xl md:hidden pt-20 px-6 pb-8 flex flex-col"
                    >
                        <nav className="space-y-2 flex-1 overflow-y-auto">
                            {NavigationItems.map((item, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={item.path}
                                >
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) => `flex items-center gap-4 p-4 rounded-xl text-lg font-medium transition-all border ${isActive
                                            ? 'bg-white/5 border-neon-cyan/30 text-neon-cyan shadow-[0_0_15px_rgba(0,242,234,0.1)]'
                                            : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon size={24} />
                                        {item.label}
                                    </NavLink>
                                </motion.div>
                            ))}
                        </nav>
                        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="text-center text-xs text-white/30 font-mono tracking-widest uppercase">
                                System Status: Optimal
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main
                ref={mainRef}
                className="flex-1 md:ml-72 pt-16 md:pt-0 relative h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-obsidian-800 scrollbar-track-transparent custom-scroll-area"
            >
                {/* Film Grain / Noise Overlay */}
                <div className="fixed inset-0 z-[1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>

                {/* Content Container */}
                <div className="relative z-10 p-4 md:p-10 max-w-7xl mx-auto pb-32 md:pb-12 min-h-screen flex flex-col">
                    <AnimatePresence mode="wait">
                        {/* Page Transition Wrapper */}
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex-1"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

