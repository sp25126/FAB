import React, { useEffect, useState } from 'react';
import { AppService } from '../api/endpoints';
import type { BrainConfigResponse } from '../api/endpoints';
import { Wifi, WifiOff } from 'lucide-react';

export const BrainStatusBadge: React.FC = () => {
    const [config, setConfig] = useState<BrainConfigResponse | null>(null);
    const [health, setHealth] = useState(false);

    useEffect(() => {
        AppService.getBrainConfig().then(setConfig);
        AppService.checkHealth().then(setHealth);
    }, []);

    if (!config) return null;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono tracking-wider ${health
            ? 'bg-green-500/10 border-green-500/20 text-green-500'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
            {health ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="font-bold">{config.brainType.toUpperCase()}</span>
            <span className="opacity-50">|</span>
            <span>{health ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
    );
};
