import React from 'react';
import { Outlet } from 'react-router-dom';
import { Brain, Cpu } from 'lucide-react';

const Layout: React.FC = () => {
    return (
        <div className="min-h-screen bg-obsidian-950 text-gray-200 font-sans selection:bg-neon-teal selection:text-obsidian-950 flex flex-col">
            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-obsidian-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-neon-teal/10 rounded-lg">
                        <Brain className="w-5 h-5 text-neon-teal" />
                    </div>
                    <span className="font-bold tracking-wider text-sm font-mono text-neon-teal/80">
                        FAB <span className="text-gray-500">//</span> COMMAND CENTER
                    </span>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>SYSTEM: ONLINE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        <span>CPU: 12%</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden">
                {/* Background Grid Animation */}
                <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}>
                </div>

                <div className="relative z-10 h-full p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
