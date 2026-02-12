import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { AppService, type UnifiedAnalysisResult } from '../api/endpoints';

interface AnalysisContextType {
    isAnalyzing: boolean;
    processingPhase: string;
    progress: number;
    result: UnifiedAnalysisResult | null;
    error: string | null;
    analysisId: string | null;
    startAnalysis: (file: File | null, username: string, token: string) => Promise<void>;
    resetAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Persistent state
    const [analysisId, setAnalysisId] = useState<string | null>(() => {
        try {
            return localStorage.getItem('fab_analysis_id');
        } catch {
            return null;
        }
    });

    const [result, setResult] = useState<UnifiedAnalysisResult | null>(() => {
        try {
            const cached = localStorage.getItem('fab_analysis_result');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    // Transient state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [processingPhase, setProcessingPhase] = useState<string>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Persist ID changes
    useEffect(() => {
        if (analysisId) {
            localStorage.setItem('fab_analysis_id', analysisId);
        } else {
            localStorage.removeItem('fab_analysis_id');
        }
    }, [analysisId]);

    // Persist result changes
    useEffect(() => {
        if (result) {
            localStorage.setItem('fab_analysis_result', JSON.stringify(result));
        } else {
            localStorage.removeItem('fab_analysis_result');
        }
    }, [result]);

    // Polling Logic
    useEffect(() => {
        if (!analysisId || result) {
            // Stop polling if no ID or if we already have the result (completed)
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
            setIsAnalyzing(false);
            if (result) setProcessingPhase('complete');
            return;
        }

        setIsAnalyzing(true);

        const poll = async () => {
            try {
                const status = await AppService.getAnalyzerStatus(analysisId);

                // Update progress
                if (status.progress) {
                    setProcessingPhase(status.progress.phase);
                    setProgress(status.progress.percent);
                }

                if (status.status === 'complete') {
                    const fullReport = await AppService.getAnalyzerReport(analysisId);
                    setResult(fullReport);
                    setProcessingPhase('complete');
                    setIsAnalyzing(false);
                    if (pollInterval.current) clearInterval(pollInterval.current);
                } else if (status.status === 'error') {
                    // Fetch full report to get detailed errors
                    try {
                        const failedReport = await AppService.getAnalyzerReport(analysisId);
                        const errorMsg = failedReport.errors?.length > 0
                            ? failedReport.errors.join('; ')
                            : 'Analysis failed on server (check backend logs).';
                        setError(errorMsg);
                    } catch {
                        setError('Analysis failed on server.');
                    }
                    setIsAnalyzing(false);
                    if (pollInterval.current) clearInterval(pollInterval.current);
                }
            } catch (err: any) {
                console.error("Polling error:", err);
                // Don't stop polling immediately on network error, but maybe warn?
                // For now, if 404, implies ID is invalid
                if (err.response?.status === 404) {
                    setError('Analysis session expired or not found.');
                    setAnalysisId(null);
                    setIsAnalyzing(false);
                }
            }
        };

        // Poll immediately and then interval
        poll();
        pollInterval.current = setInterval(poll, 3000);

        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
        };
    }, [analysisId, result]);

    const startAnalysis = async (file: File | null, username: string, token: string) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setProcessingPhase('initializing');
        setProgress(0);

        try {
            // Note: startDeepSearch might need file argument if valid
            const response = await AppService.startDeepSearch(username, token, file || undefined);
            setAnalysisId(response.analysisId);
            // Polling will effectively start due to useEffect on analysisId change
        } catch (err: any) {
            console.error('Failed to start analysis:', err);
            setError(err.response?.data?.error || err.message || 'Failed to start analysis');
            setIsAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setAnalysisId(null);
        setResult(null);
        setError(null);
        setProcessingPhase('idle');
        setProgress(0);
        localStorage.removeItem('fab_analysis_id');
        localStorage.removeItem('fab_analysis_result');
    };

    return (
        <AnalysisContext.Provider value={{
            isAnalyzing,
            processingPhase,
            progress,
            result,
            error,
            analysisId,
            startAnalysis,
            resetAnalysis
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (context === undefined) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
};
