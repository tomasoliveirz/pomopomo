'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ProfileSetupModalProps {
    roomId?: string;
    onClose: () => void;
    onCompleted: (name: string) => void;
}

export default function ProfileSetupModal({ roomId, onClose, onCompleted }: ProfileSetupModalProps) {
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName, roomId }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed');
            }

            onCompleted(displayName);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative bg-bg w-full max-w-md rounded-xl shadow-2xl p-6 border border-border"
            >
                <h2 className="text-xl font-bold mb-2">Complete your Profile</h2>
                <p className="text-sm opacity-70 mb-4">
                    Set a display name to unlock all features. You can always change this later in settings.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="input w-full"
                            placeholder="e.g. PomodoroPro"
                            required
                            minLength={2}
                            maxLength={30}
                            autoFocus
                        />
                    </div>

                    {error && <div className="text-warning text-sm">{error}</div>}

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost"
                            disabled={loading}
                        >
                            Skip for now
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !displayName.trim()}
                            className="btn-primary"
                        >
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
