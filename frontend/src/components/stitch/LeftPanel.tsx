import React from 'react';

const LeftPanel: React.FC = () => {
    return (
        <section className="hidden lg:flex w-[40%] flex-col relative border-r border-glass-border bg-obsidian/30 h-full">
            {/* Grid Background Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(13, 242, 242, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 242, 242, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                {/* AI Visual Representation */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                    {/* Outer Rings */}
                    <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-4 border border-dashed border-primary/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                    {/* Core Orb */}
                    <div className="w-40 h-40 bg-gradient-to-br from-primary to-teal-600 rounded-full animate-pulse-slow relative z-10 flex items-center justify-center overflow-hidden shadow-[0_0_80px_-10px_rgba(13,242,242,0.6)]">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=500&auto=format&fit=crop')] bg-cover mix-blend-overlay opacity-60"></div>
                        <span className="material-symbols-outlined text-black text-5xl animate-pulse">graphic_eq</span>
                    </div>
                    {/* Floating Data Points */}
                    <div className="absolute top-0 right-10 bg-black/80 border border-primary/30 text-primary text-xs px-2 py-1 rounded backdrop-blur-sm">Voice Analysis: Active</div>
                    <div className="absolute bottom-10 left-0 bg-black/80 border border-primary/30 text-primary text-xs px-2 py-1 rounded backdrop-blur-sm">Sentiment: Confident</div>
                </div>
                <div className="mt-10 text-center z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight font-display">SENIOR ARCHITECT AI</h2>
                    <p className="text-primary/70 font-mono text-sm uppercase tracking-widest mb-6">Analyzing Response Patterns...</p>
                    <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full glass-panel">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs font-mono text-white/80">RECORDING</span>
                        </div>
                        <div className="w-px h-4 bg-white/20"></div>
                        <span className="text-xs font-mono text-white/80">SESSION: 00:14:22</span>
                    </div>
                </div>
            </div>
            {/* Bottom Stats */}
            <div className="p-6 border-t border-glass-border grid grid-cols-3 gap-4 bg-black/20">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-white/40 tracking-wider">Technical Depth</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_10px_rgba(13,242,242,0.5)]"></div>
                    </div>
                    <span className="text-xs font-bold text-primary">85%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-white/40 tracking-wider">Clarity</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 w-[92%] rounded-full"></div>
                    </div>
                    <span className="text-xs font-bold text-purple-400">92%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-white/40 tracking-wider">Efficiency</span>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 w-[64%] rounded-full"></div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">64%</span>
                </div>
            </div>
        </section>
    );
};

export default LeftPanel;
