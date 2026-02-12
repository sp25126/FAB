import React from 'react';
import { Github, Brain } from 'lucide-react';
import { AppService } from '../api/endpoints';

export const Login: React.FC = () => {

    const [isLoading, setIsLoading] = React.useState(false);

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            document.body.setAttribute('data-logging-in', 'true');
            const { url } = await AppService.getGithubLoginUrl();
            window.location.href = url;
        } catch (e) {
            console.error("Failed to get login URL", e);
            setIsLoading(false);
            document.body.removeAttribute('data-logging-in');
        }
    };

    return (
        <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-teal/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 text-center max-w-md w-full space-y-8 glass-panel p-12 rounded-3xl border border-white/10 shadow-2xl">

                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-neon-teal/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-neon-teal/50 shadow-[0_0_20px_rgba(13,242,242,0.3)]">
                        <Brain className="text-neon-teal" size={32} />
                    </div>
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                        FAB <span className="text-white/40">// IDENTITY</span>
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed">
                        Access the integrity engine. Verify your engineering DNA via GitHub.
                    </p>
                </div>

                <div className="pt-8">
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-[#24292e] hover:bg-[#2f363d] disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg border border-white/5 group"
                    >
                        <Github size={24} className="group-hover:text-white transition-colors text-white/90" />
                        <span>
                            {isLoading ? 'Logging in...' : 'Continue with GitHub'}
                        </span>
                    </button>
                    <p className="mt-4 text-xs text-white/30 uppercase tracking-widest font-mono">
                        Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    );
};
