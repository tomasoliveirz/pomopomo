'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';

function JoinRoomContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');

  const [code, setCode] = useState(urlCode || '');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(!!urlCode);
  const router = useRouter();

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode);
      setIsCodeLocked(true);
      setTimeout(() => document.getElementById('displayName')?.focus(), 100);
    }
  }, [urlCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) {
      setError('Please fill in all fields ✨');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Oops! Could not join room.');

      localStorage.setItem('wsToken', result.data.wsToken);
      localStorage.setItem('participantId', result.data.participant.id);
      localStorage.setItem('roomCode', result.data.room.code);

      router.push(`/room/${code.trim()}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#FAFAFA]">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/60">
          <div className="flex flex-col items-center mb-8">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
              <Logo size="medium" />
            </motion.div>
            <h2 className="text-2xl font-bold font-display text-gray-800 mt-4">Join Session</h2>
            {isCodeLocked && (
              <div className="mt-2 px-3 py-1 bg-green-100/50 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                🔒 Invite to {code}
              </div>
            )}
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 ml-1">Room Code</label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. pomo-XY9Z"
                  className={`w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none font-mono font-medium text-lg transition-all ${isCodeLocked ? 'opacity-60 cursor-not-allowed' : 'focus:bg-white focus:ring-4 focus:ring-blue-100'}`}
                  disabled={isCodeLocked || loading}
                />
                {isCodeLocked && (
                  <button
                    type="button"
                    onClick={() => { setIsCodeLocked(false); setCode(''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-500 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-500 ml-1">Your Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none outline-none font-medium text-lg transition-all focus:bg-white focus:ring-4 focus:ring-green-100"
                maxLength={20}
                disabled={loading}
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 text-red-500 rounded-xl text-sm font-bold text-center">
                {error}
              </motion.div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg shadow-lg shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room ✨'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function JoinRoom() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinRoomContent />
    </Suspense>
  );
}
