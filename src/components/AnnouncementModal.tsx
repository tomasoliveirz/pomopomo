'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';

const RELEASE_KEY = 'pomopomo_announcement_release_0_seen';

export default function AnnouncementModal() {
    const { data: session } = useSession();
    const isAuthenticated = !!session?.user;
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Wait for session to be determined (optional, but good practice)
        // Only show if not authenticated (guest) and haven't seen it yet
        if (isAuthenticated) return;

        const seen = localStorage.getItem(RELEASE_KEY);
        if (!seen) {
            // Small delay to not feel intrusive immediately
            const timer = setTimeout(() => {
                setOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated]);

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem(RELEASE_KEY, '1');
    };

    const handleCreateAccount = () => {
        handleClose();
        router.push('/signin?callbackUrl=/');
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-white/50 overflow-hidden"
                    >
                        {/* Decorative Background Blob */}
                        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>

                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-16 h-16 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
                                <Sparkles size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">New: PomoPomo Accounts ✨</h2>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Hey! We’ve shipped a brand-new update — you can now create your own PomoPomo account to keep your profile across rooms.<br /><br />
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Coming Soon</span><br />
                                Private messages, public rooms by country/language, and easier room discovery.
                            </p>

                            <p className="text-sm text-gray-500 mb-8 italic">
                                Prefer to stay anonymous? Guest mode is still available anytime.
                            </p>

                            <div className="w-full space-y-3">
                                <button
                                    onClick={handleCreateAccount}
                                    className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-bold text-lg shadow-lg shadow-violet-600/25 hover:bg-violet-700 hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Create Account
                                </button>

                                <button
                                    onClick={handleClose}
                                    className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Continue as Guest
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
