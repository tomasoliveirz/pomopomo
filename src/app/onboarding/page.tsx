'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

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
                body: JSON.stringify({ displayName }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Failed');
            }

            // Redirect to original destination
            router.push(callbackUrl);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDF6E3] flex items-center justify-center p-4 font-mono text-[#586E75]">
            <div className="max-w-md w-full bg-[#EEE8D5] p-8 rounded-lg shadow-lg border-2 border-[#93A1A1]">
                <h1 className="text-2xl font-bold mb-2 text-[#cb4b16]">Welcome!</h1>
                <p className="mb-6 text-sm">Let's set up your profile to get started.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-[#FDF6E3] border border-[#93A1A1] rounded px-3 py-2 focus:outline-none focus:border-[#268BD2]"
                            placeholder="e.g. PomodoroMaster"
                            required
                            minLength={2}
                            maxLength={30}
                        />
                    </div>

                    {error && <div className="text-[#dc322f] text-sm">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2AA198] text-[#FDF6E3] font-bold py-2 rounded border-b-4 border-[#20756d] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
}
