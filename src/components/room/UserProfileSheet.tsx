
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Participant } from '@/types';

interface UserProfileSheetProps {
    participant: Participant | null;
    onClose: () => void;
}

export default function UserProfileSheet({ participant, onClose }: UserProfileSheetProps) {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (participant?.userId) {
            setLoading(true);
            setProfile(null);
            fetch(`/api/user/profile/${participant.userId}`)
                .then(async res => {
                    if (res.status === 404) return null; // Expected if no profile
                    if (!res.ok) throw new Error('Failed to fetch');
                    return res.json();
                })
                .then(data => {
                    if (data?.profile) setProfile(data.profile);
                })
                .catch(err => {
                    // console.error("Failed to fetch profile", err); // Muted common error
                })
                .finally(() => setLoading(false));
        } else {
            setProfile(null);
        }
    }, [participant]);

    if (!participant) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="rounded-[2rem] border border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl p-6 w-full max-w-sm relative z-10 overflow-hidden"
            >
                <div className="relative z-10 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full border-4 border-white/50 shadow-inner bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center text-4xl text-primary mb-4 overflow-hidden">
                        {profile?.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={participant.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span>{participant.displayName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">{profile?.displayName || participant.displayName}</h2>

                    {profile?.username && (
                        <p className="text-primary font-mono text-sm font-medium">@{profile.username}</p>
                    )}

                    <span className="text-xs font-bold uppercase tracking-wider text-white bg-primary/80 px-3 py-1 rounded-full mt-2 shadow-sm">
                        {participant.role === 'host' ? '👑 Host' : 'Participant'}
                    </span>

                    <div className="mt-6 w-full space-y-3">
                        {loading ? (
                            <div className="text-center text-xs text-gray-400 animate-pulse mt-2">Loading profile...</div>
                        ) : profile?.bio ? (
                            <div className="p-4 bg-white/40 rounded-2xl border border-white/20">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">About</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-white/40 rounded-2xl text-center border border-white/20">
                                <p className="text-sm text-gray-400 italic">No bio yet</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-8 w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-white/50 transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
