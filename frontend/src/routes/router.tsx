import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Login } from '../pages/Login';
import { AuthCallback } from '../pages/AuthCallback';
import {
    Home, VerifyResume, AnalyzeGithub, Analyzer,
    InterviewSetup, InterviewLive, InterviewSummary,
    Growth, Settings, Diagnostics, Profile, FixSkills // [NEW]
} from '../pages'; // Importing from index.tsx
import { InteractiveAnalyzer } from '../pages/InteractiveAnalyzer';
import { ProjectRoadmapView } from '../components/ProjectRoadmap';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/auth/callback',
        element: <AuthCallback />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppShell />,
                children: [
                    { path: '/', element: <Home /> },
                    { path: 'analyze', element: <Analyzer /> }, // NEW: Unified Resume + GitHub Analyzer (using Analyzer.tsx)
                    { path: 'verify', element: <VerifyResume /> }, // Legacy fallback
                    { path: 'fix-skills', element: <FixSkills /> }, // [NEW]
                    { path: 'github', element: <AnalyzeGithub /> }, // Legacy fallback
                    { path: 'analyzer', element: <Analyzer /> },
                    { path: 'interview/setup', element: <InterviewSetup /> },
                    { path: 'interview/live/:sessionId?', element: <InterviewLive /> },
                    { path: 'interview/summary', element: <InterviewSummary /> },
                    { path: 'growth', element: <Growth /> },
                    { path: 'profile', element: <Profile /> },
                    { path: 'roadmap', element: <ProjectRoadmapView /> },
                    { path: 'project/:projectId', element: <ProjectRoadmapView /> }, // [NEW] Route for project details
                    { path: 'interactive', element: <InteractiveAnalyzer /> }, // NEW: Interactive analyzer features
                    { path: 'settings', element: <Settings /> },
                    { path: 'diagnostics', element: <Diagnostics /> },
                ],
            },
        ],
    },
]);
