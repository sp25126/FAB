import React, { useEffect, useState } from 'react';
import { AppService } from '../api/endpoints';
import type { BrainConfigResponse } from '../api/endpoints';
import { Terminal, Check, X, Loader } from 'lucide-react';

export const Diagnostics: React.FC = () => {
    const [health, setHealth] = useState<'OK' | 'ERROR' | 'CHECKING'>('CHECKING');
    const [config, setConfig] = useState<BrainConfigResponse | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    useEffect(() => {
        const runDiagnostics = async () => {
            addLog("Initializing diagnostics sequence...");

            // Check Config
            const conf = await AppService.getBrainConfig();
            setConfig(conf);
            addLog(`Brain Config: ${conf.brainType} (${conf.status})`);

            // Check API Health
            addLog("Pinging API gateway...");
            const isHealthy = await AppService.checkHealth();
            if (isHealthy) {
                setHealth('OK');
                addLog("API Gateway: ONLINE (200 OK)");
            } else {
                setHealth('ERROR');
                addLog("API Gateway: UNREACHABLE");
            }


        };

        runDiagnostics();
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-display font-bold">System Diagnostics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-white/40 uppercase mb-4">Functional Status</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                            <span>API Gateway</span>
                            {health === 'CHECKING' ? <Loader className="animate-spin text-white/40" /> :
                                health === 'OK' ? <span className="text-green-500 font-bold flex items-center gap-2"><Check size={16} /> ONLINE</span> :
                                    <span className="text-red-500 font-bold flex items-center gap-2"><X size={16} /> OFFLINE</span>}
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                            <span>Brain Context</span>
                            <span className="text-white/60">{config ? config.brainType.toUpperCase() : '...'}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl bg-black font-mono text-xs overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 text-white/40 border-b border-white/10 pb-2 mb-2">
                        <Terminal size={14} />
                        <span>Event Log</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 h-48 text-green-400/80">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div className="animate-pulse">_</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
