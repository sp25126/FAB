import { useState, useEffect } from 'react';
import { AppService } from '../api/endpoints';
import type { UserProfile } from '../api/endpoints';

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        try {
            const cached = localStorage.getItem('fab_profile');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.error("Failed to parse cached profile", e);
            return null;
        }
    });
    const [loading, setLoading] = useState(!profile);
    const [error, setError] = useState<string | null>(null);

    const username = localStorage.getItem('fab_username');

    const fetchProfile = async () => {
        if (!username) return;

        try {
            setLoading(true);
            const data = await AppService.getProfile(username);
            setProfile(data);
            localStorage.setItem('fab_profile', JSON.stringify(data));
            setError(null);
        } catch (e: any) {
            console.error("Failed to fetch profile", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (updates: any) => {
        if (!username) return;
        try {
            setLoading(true);
            const data = await AppService.updateProfile({ ...updates, username });
            setProfile(data);
            localStorage.setItem('fab_profile', JSON.stringify(data));
            setError(null);
        } catch (e: any) {
            console.error("Failed to update profile", e);
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (username) {
            fetchProfile();
        }
    }, [username]);

    return {
        profile,
        loading,
        error,
        refreshProfile: fetchProfile,
        updateProfile,
        username
    };
}
