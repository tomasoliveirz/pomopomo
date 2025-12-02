'use client';

import { useState, useEffect, useRef } from 'react';
import { loadPrefs, savePrefs, AlertPrefs } from '@/alerts/prefs';
import { ensureNotificationPermission, unlockAudioOnce, playEndChime } from '@/alerts/helpers';

type Tab = 'timer' | 'sounds';

import { motion, AnimatePresence } from 'framer-motion';

export default function RoomSettingsModal({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<Tab>('timer');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
        >
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <motion.div
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 overflow-hidden flex flex-col max-h-[85vh]"
            >

                {/* Header with Tabs */}
                <div className="p-6 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold font-display text-gray-800">Settings</h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-xl"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex p-1 bg-gray-100/80 rounded-full mb-2">
                        <button
                            onClick={() => setActiveTab('timer')}
                            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'timer'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            ⏱️ Timer
                        </button>
                        <button
                            onClick={() => setActiveTab('sounds')}
                            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'sounds'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🔔 Sounds
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <motion.div
                    layout
                    className="p-6 overflow-y-auto min-h-0 flex-1"
                >
                    <AnimatePresence mode="wait">
                        {activeTab === 'timer' ? (
                            <motion.div
                                key="timer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TimerSettings />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sounds"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SoundSettings />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

// --- SUB-COMPONENTS ---

function TimerSettings() {
    const [preset, setPreset] = useState(() => {
        if (typeof window === 'undefined') return { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15 };
        const saved = localStorage.getItem('pomopomoIntervals');
        return saved ? JSON.parse(saved) : { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15 };
    });

    const [showSaved, setShowSaved] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            localStorage.setItem('pomopomoIntervals', JSON.stringify(preset));
            // Dispatch event for real-time sync
            window.dispatchEvent(new Event('storage-local-update'));

            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2000);
        }, 500);

        return () => clearTimeout(timer);
    }, [preset]);

    return (
        <div className="space-y-6">
            {/* Inputs com estilo Kawaii Chunky */}
            <div className="space-y-4">
                <NumberInput
                    label="🎯 Focus (min)"
                    value={preset.focusDuration}
                    onChange={v => setPreset({ ...preset, focusDuration: v })}
                />
                <NumberInput
                    label="☕ Short Break (min)"
                    value={preset.shortBreakDuration}
                    onChange={v => setPreset({ ...preset, shortBreakDuration: v })}
                />
                <NumberInput
                    label="🌴 Long Break (min)"
                    value={preset.longBreakDuration}
                    onChange={v => setPreset({ ...preset, longBreakDuration: v })}
                />
            </div>

            {showSaved && (
                <div className="text-xs font-bold text-center text-green-500 animate-fade-in">
                    ✓ Preferences saved automatically
                </div>
            )}
        </div>
    );
}

function SoundSettings() {
    const [p, setP] = useState<AlertPrefs>(loadPrefs());
    const [showSaved, setShowSaved] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        savePrefs(p);
        setShowSaved(true);
        const t = setTimeout(() => setShowSaved(false), 2000);
        return () => clearTimeout(t);
    }, [p]);

    const toggle = (k: keyof AlertPrefs) => async () => {
        if (k === 'notifications' && !p.notifications) {
            const ok = await ensureNotificationPermission();
            if (!ok) return alert('Enable notifications in browser settings.');
        }
        if (k === 'chime' && !p.chime && !p.unlockedAudio) {
            const ok = await unlockAudioOnce();
            if (ok) setP(prev => ({ ...prev, chime: true, unlockedAudio: true }));
            // Test sound on toggle
            playEndChime({ volume: 0.5, repeats: 0 });
        }
        setP(prev => ({ ...prev, [k]: !prev[k] }));
    };

    return (
        <div className="space-y-4">
            {/* Test Sound Button - Chunky */}
            <button
                onClick={() => playEndChime({ volume: p.boosted ? 1 : 0.6, repeats: 0 })}
                className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all mb-4"
            >
                🎵 Test Audio & Vibration
            </button>

            <div className="space-y-2">
                <ToggleRow label="End Chime" active={p.chime} onClick={toggle('chime')} />
                <ToggleRow label="Boost Volume" active={p.boosted} onClick={toggle('boosted')} disabled={!p.chime} />
                <ToggleRow label="Vibrate" active={p.vibrate} onClick={toggle('vibrate')} />
                <ToggleRow label="Notifications" active={p.notifications} onClick={toggle('notifications')} />
            </div>

            {showSaved && (
                <div className="text-xs font-bold text-center text-green-500 animate-fade-in pt-2">
                    ✓ Saved
                </div>
            )}
        </div>
    );
}

// --- UI HELPERS ---

function NumberInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    const [localValue, setLocalValue] = useState<string>(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow empty string or numbers only
        if (val === '' || /^\d+$/.test(val)) {
            setLocalValue(val);
            if (val !== '') {
                onChange(parseInt(val, 10));
            }
        }
    };

    const handleBlur = () => {
        if (localValue === '' || parseInt(localValue) === 0) {
            // Default to 1 if empty or 0
            setLocalValue('1');
            onChange(1);
        }
    };

    return (
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between group focus-within:ring-2 focus-within:ring-blue-200 transition-all">
            <span className="font-bold text-gray-600 text-sm">{label}</span>
            <input
                type="text"
                inputMode="numeric"
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-16 bg-white rounded-xl py-2 px-2 text-center font-bold text-gray-800 outline-none"
            />
        </div>
    );
}

function ToggleRow({ label, active, onClick, disabled }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${disabled ? 'opacity-50' : 'hover:bg-gray-50 active:scale-[0.98]'}`}
        >
            <span className="font-bold text-gray-700">{label}</span>
            <div className={`w-12 h-7 rounded-full transition-colors relative ${active ? 'bg-green-400' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </button>
    );
}
