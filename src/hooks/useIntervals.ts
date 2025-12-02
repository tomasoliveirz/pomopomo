import { useState, useEffect } from 'react';

export interface IntervalSettings {
    focusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
}

const DEFAULT_INTERVALS: IntervalSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
};

export function usePersistentIntervals() {
    const [intervals, setIntervals] = useState<IntervalSettings>(() => {
        if (typeof window === 'undefined') return DEFAULT_INTERVALS;
        try {
            const saved = localStorage.getItem('pomopomoIntervals');
            return saved ? JSON.parse(saved) : DEFAULT_INTERVALS;
        } catch {
            return DEFAULT_INTERVALS;
        }
    });

    useEffect(() => {
        const handleStorageUpdate = () => {
            try {
                const saved = localStorage.getItem('pomopomoIntervals');
                if (saved) {
                    setIntervals(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Failed to parse intervals', e);
            }
        };

        // Listen for custom local update event
        window.addEventListener('storage-local-update', handleStorageUpdate);
        // Listen for storage events (cross-tab sync)
        window.addEventListener('storage', handleStorageUpdate);

        return () => {
            window.removeEventListener('storage-local-update', handleStorageUpdate);
            window.removeEventListener('storage', handleStorageUpdate);
        };
    }, []);

    return intervals;
}
