import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenTutorialProps {
    onClose: () => void;
    onTokenProvided: (token: string) => void;
}

export const TokenTutorial: React.FC<TokenTutorialProps> = ({ onClose, onTokenProvided }) => {
    const [token, setToken] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [copied, setCopied] = useState(false);

    const steps = [
        {
            number: 1,
            title: 'Navigate to GitHub Settings',
            description: 'Go to your GitHub profile → Settings → Developer settings',
            action: (
                <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <span>Open GitHub Settings</span>
                    <ExternalLink className="w-4 h-4" />
                </a>
            )
        },
        {
            number: 2,
            title: 'Generate New Token',
            description: 'Click "Personal access tokens" → "Tokens (classic)" → "Generate new token (classic)"',
            note: 'You may need to confirm your password'
        },
        {
            number: 3,
            title: 'Configure Token Permissions',
            description: 'Set a descriptive note (e.g., "FAB Analyzer") and select the following scope:',
            permissions: [
                { name: 'repo', description: 'Full control of private repositories (required for deep analysis)' }
            ]
        },
        {
            number: 4,
            title: 'Copy Your Token',
            description: 'Click "Generate token" at the bottom, then IMMEDIATELY copy the token.',
            warning: 'You won\'t be able to see this token again! If you lose it, you\'ll need to generate a new one.'
        }
    ];

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = () => {
        if (token.trim()) {
            onTokenProvided(token.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
                {/* Header */}
                <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        GitHub Token Setup Guide
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Get deep insights by providing access to your repositories
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className={`p-6 rounded-xl border transition-all ${currentStep === step.number
                                        ? 'bg-white/5 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                        : 'bg-white/[0.02] border-white/5'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= step.number
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/10 text-slate-500'
                                        }`}>
                                        {step.number}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                                        <p className="text-slate-300 text-sm mb-3">{step.description}</p>

                                        {step.action && <div className="mt-3">{step.action}</div>}

                                        {step.permissions && (
                                            <div className="mt-3 space-y-2">
                                                {step.permissions.map((perm) => (
                                                    <div key={perm.name} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                                        <input type="checkbox" checked readOnly className="mt-1" />
                                                        <div>
                                                            <code className="text-blue-400 text-sm">{perm.name}</code>
                                                            <p className="text-xs text-slate-400 mt-1">{perm.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {step.note && (
                                            <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-yellow-200">{step.note}</p>
                                            </div>
                                        )}

                                        {step.warning && (
                                            <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-200 font-medium">{step.warning}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {currentStep === step.number && step.number < 4 && (
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => setCurrentStep(step.number + 1)}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Next Step →
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer - Token Input */}
                <div className="px-8 py-6 bg-white/5 border-t border-white/10">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                        Paste your GitHub Token:
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white placeholder-slate-500"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!token.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all"
                        >
                            Continue
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                        🔒 Your token is never stored on our servers and is only used for this session.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
