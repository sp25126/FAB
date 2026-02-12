import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppService } from '../api/endpoints';

export const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const username = searchParams.get('username'); // Fallback/Legacy support
        const token = searchParams.get('token');

        const exchange = async () => {
            if (code) {
                try {
                    const data = await AppService.exchangeGithubCode(code);
                    localStorage.setItem('fab_username', data.username);
                    localStorage.setItem('fab_token', data.token);
                    navigate('/', { replace: true });
                } catch (e) {
                    console.error("Auth Failed", e);
                    navigate('/login?error=exchange_failed');
                }
            } else if (username && token) {
                // Direct storage if using old flow (unlikely but safe to keep)
                localStorage.setItem('fab_username', username);
                localStorage.setItem('fab_token', token);
                navigate('/', { replace: true });
            } else {
                navigate('/login?error=no_code');
            }
        };

        exchange();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center text-center">
            <Loader2 size={48} className="text-neon-teal animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Authenticating...</h2>
            <p className="text-white/40">Establishing secure uplink.</p>
        </div>
    );
};
