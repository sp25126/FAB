import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
    const username = localStorage.getItem('fab_username');
    const token = localStorage.getItem('fab_token');

    // Strict check: Must have username, token, and not be the legacy 'user' placeholder
    if (!username || !token || username === 'user') {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
