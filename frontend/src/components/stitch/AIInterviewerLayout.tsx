import React, { useState } from 'react';
import ProfileDialog from './ProfileDialog';

interface AIInterviewerLayoutProps {
    children: React.ReactNode;
}

const AIInterviewerLayout: React.FC<AIInterviewerLayoutProps> = ({ children }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <div className="bg-background-dark font-display text-white h-screen flex flex-col overflow-hidden selection:bg-primary selection:text-black">
            {/* Header */}
            <header className="h-16 border-b border-glass-border flex items-center justify-between px-6 bg-obsidian/80 backdrop-blur-md z-50 shrink-0">
                <div className="flex items-center gap-3 text-primary">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                    <h1 className="text-xl font-bold tracking-widest uppercase">AI Interviewer <span className="text-white/50 text-sm font-normal normal-case ml-2">| System Architecture</span></h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
                        <a className="hover:text-primary transition-colors cursor-pointer">Dashboard</a>
                        <a className="text-white hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Live Session
                        </a>
                        <a className="hover:text-primary transition-colors cursor-pointer" onClick={() => setIsProfileOpen(true)}>Settings</a>
                    </div>
                    <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">call_end</span>
                        End Interview
                    </button>
                    <button onClick={() => setIsProfileOpen(true)} className="h-9 w-9 rounded-full bg-cover bg-center border border-white/20 transition-transform hover:scale-105" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAg2JytFH4jJ7ioeFCkOQzYQT-dClNWCOWQeeUNMc3H1QWYrl1-FLdWuWXnVaEiepIZ1IyJW0toFElrCY0JW9xQz1dbCT11ZS_WIlRAOy6HUMS9DbRnHDIGZtv-Pvo8Ns4FcndYHvlwJugMr39BDFZv29OryI6fM18xu_p3NLYKshx9pqrPlskSF6IwGnxOYQIzi6Y-k4k3_nregQ4dnDRYykR3u_LftmqdsDmYGA7ygrhbsV_uuCfz1vLUqjtfDPxmTUA7FWNhpA')" }}></button>
                </div>
            </header>

            <ProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Background Ambient Glows */}
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-primary/5 blur-[100px] pointer-events-none"></div>

                {children}
            </main>
        </div>
    );
};

export default AIInterviewerLayout;
