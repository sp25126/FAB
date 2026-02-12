import { useEffect } from 'react';
import type { RefObject } from 'react';

export const useScrollGlow = (ref: RefObject<HTMLElement>) => {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const handleScroll = () => {
            // Add glow class
            element.classList.add('scrolling-glow');

            // Clear existing timeout
            if (timeoutId) clearTimeout(timeoutId);

            // Remove glow class after delays
            timeoutId = setTimeout(() => {
                element.classList.remove('scrolling-glow');
            }, 800);
        };

        element.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', handleScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [ref]);
};
