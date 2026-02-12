import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RAGItem {
    id: string;
    title: string;
    content: string;
    match: string;
    icon: string;
    color?: string;
}

const RAGPanel: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState<number | null>(null);
    const [feed, setFeed] = useState<RAGItem[]>([]);

    useEffect(() => {
        // Load Real Data from LocalStorage
        const stored = localStorage.getItem('fab_verification');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                // Transform verification data into RAG items
                const claims = (data.verification || []).map((v: any, i: number) => ({
                    id: `CLM-${1000 + i}`,
                    title: v.claim || "Skill Claim",
                    content: `Verified: ${v.status} | Confidence: ${v.confidence}% | Source: ${v.source}`,
                    match: `${v.confidence}%`,
                    icon: v.status === 'VERIFIED' ? 'check_circle' : 'warning',
                    color: v.status === 'VERIFIED' ? 'text-green-400' : 'text-amber-400'
                }));

                const bio = {
                    id: 'BIO-001',
                    title: 'Resume Summary',
                    content: data.resumeBio || "No summary available.",
                    match: '100%',
                    icon: 'person',
                    color: 'text-primary'
                };

                setFeed([bio, ...claims]);
            } catch (e) {
                console.error("Failed to parse RAG data", e);
            }
        }
    }, []);

    // Random highlighting effect for "Active Retrieval" simulation
    useEffect(() => {
        if (feed.length === 0) return;
        const interval = setInterval(() => {
            const idx = Math.floor(Math.random() * feed.length);
            setActiveItem(idx);
            setTimeout(() => setActiveItem(null), 2000);
        }, 5000);
        return () => clearInterval(interval);
    }, [feed]);

    return (
        <motion.div
            initial={{ width: 240 }}
            animate={{ width: collapsed ? 60 : 240 }}
            className="absolute top-0 right-0 h-full border-l border-glass-border bg-obsidian/80 backdrop-blur-xl flex flex-col z-20 transition-all duration-300"
        >
            <div className="p-4 border-b border-glass-border flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center gap-2 text-primary/80">
                        <span className="material-symbols-outlined text-sm animate-spin-slow">data_usage</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Context Retrieval</span>
                    </div>
                )}
                <button onClick={() => setCollapsed(!collapsed)} className="ml-auto p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">{collapsed ? 'first_page' : 'last_page'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 rag-scroll overflow-x-hidden">
                {feed.length === 0 ? (
                    <div className="text-center text-white/30 text-xs mt-10">
                        Waiting for context...
                    </div>
                ) : (
                    feed.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layout
                            className={`group cursor-pointer ${collapsed ? 'flex justify-center' : ''}`}
                            whileHover={{ scale: 1.02, x: collapsed ? 0 : -4 }}
                        >
                            {!collapsed ? (
                                <>
                                    <div className="text-[10px] text-white/40 mb-1 flex justify-between">
                                        <span>{item.id}</span>
                                        <span className="text-primary/60">{item.match} match</span>
                                    </div>
                                    <div className={`p-3 bg-white/5 border rounded transition-all ${activeItem === index ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(13,242,242,0.2)]' : 'border-white/10 hover:border-primary/40 hover:bg-primary/5'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`material-symbols-outlined text-xs ${item.color || 'text-primary'}`}>{item.icon}</span>
                                            <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                                        </div>
                                        <p className="text-[10px] text-white/60 leading-normal line-clamp-3">
                                            {item.content}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/10 hover:border-primary/50 transition-colors" title={item.title}>
                                    <span className={`material-symbols-outlined text-lg ${item.color || 'text-primary'}`}>{item.icon}</span>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {!collapsed && (
                <div className="p-3 border-t border-glass-border bg-black/20">
                    <button className="w-full py-1.5 text-xs text-white/50 hover:text-white flex items-center justify-center gap-1 transition-colors">
                        <span className="material-symbols-outlined text-sm">history</span>
                        View Source History
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default RAGPanel;
