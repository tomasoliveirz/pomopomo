
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signOut } from 'next-auth/react';
import { Loader2, Check, X } from 'lucide-react';
// TextArea removed as it doesn't exist

interface ProfileSetupModalProps {
    roomId?: string;
    onComplete: () => void;
}

export default function ProfileSetupModal({ roomId, onComplete }: ProfileSetupModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');

    // Verification State
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [checkError, setCheckError] = useState<string | null>(null);

    // Debounce Username Check
    useEffect(() => {
        const check = async () => {
            if (username.length < 3) {
                setIsAvailable(null);
                setCheckError(null);
                return;
            }

            setIsChecking(true);
            setCheckError(null);

            try {
                const res = await fetch(`/api/username/check?u=${encodeURIComponent(username)}`);
                const data = await res.json();
                if (data.available) {
                    setIsAvailable(true);
                } else {
                    setIsAvailable(false);
                    setCheckError(data.error || 'Username unavailable');
                }
            } catch (e) {
                setCheckError('Failed to check availability');
            } finally {
                setIsChecking(false);
            }
        };

        const timer = setTimeout(check, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const handleNext = () => {
        if (step === 1 && isAvailable) {
            setStep(2);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/user/profile/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    displayName,
                    bio,
                    roomId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            // Success
            onComplete();

        } catch (error: any) {
            alert(error.message); // Simple error handling for now
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-zinc-800"
            >
                <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {step === 1 ? "Choose your Identity" : "Setup Profile"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {step === 1
                            ? "Pick a unique username. This will be your permanent handle."
                            : "Introduce yourself to the community."}
                    </p>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">@</span>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                                    className="pl-8 lowercase font-mono"
                                    placeholder="username"
                                    autoFocus
                                />
                                <div className="absolute right-3 top-2.5 bg-white dark:bg-zinc-900">
                                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> :
                                        isAvailable === true ? <Check className="w-4 h-4 text-green-500" /> :
                                            isAvailable === false ? <X className="w-4 h-4 text-red-500" /> : null}
                                </div>
                            </div>
                            {checkError && <p className="text-xs text-red-500 font-medium">{checkError}</p>}
                            <p className="text-xs text-gray-400">Unique, permanent, lowercase.</p>
                        </div>

                        <div className="pt-2 space-y-3">
                            <Button
                                className="w-full"
                                onClick={handleNext}
                                disabled={!isAvailable || isChecking || username.length < 3}
                            >
                                Continue
                            </Button>
                            <Button variant="ghost" className="w-full text-gray-500" onClick={() => signOut()}>
                                Sign Out
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g. Tomato Master"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio <span className="text-gray-400 font-normal">(Optional)</span></label>
                            {/* Fallback to textarea if TextArea component doesn't exist */}
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="What are you working on?"
                                maxLength={280}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-none"
                            />
                            <p className="text-xs text-right text-gray-400">{bio.length}/280</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                loading={loading}
                                disabled={!displayName.trim()}
                            >
                                Complete Profile
                            </Button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
