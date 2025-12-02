'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import type { Theme } from '@/types';

// Theme configuration with colors for the swatches
const themes: { id: Theme; color: string; label: string }[] = [
  { id: 'lofi_girl', color: '#ffb7b2', label: 'Lofi Girl' },
  { id: 'matcha_latte', color: '#9dc08b', label: 'Matcha' },
  { id: 'sky_blue', color: '#87ceeb', label: 'Sky' },
  { id: 'strawberry', color: '#fc8181', label: 'Berry' },
  { id: 'night_mode', color: '#4a5568', label: 'Night' },
];

export default function RoomCreator() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('lofi_girl');
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreate = async () => {
    if (!hostName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme, hostName: hostName.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room');
      }

      // Store WS token and participant info in localStorage
      localStorage.setItem('wsToken', result.data.wsToken);
      localStorage.setItem('participantId', result.data.participant.id);
      localStorage.setItem('roomCode', result.data.room.code);

      router.push(`/room/${result.data.room.code}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ease-in-out"
      data-theme={selectedTheme}
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center flex flex-col items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mb-6"
          >
            <Logo size="medium" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-text/90 font-display">
            Create a Room
          </h2>
          <p className="text-text/60 mt-2 font-medium">
            Start a productive session with friends
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl shadow-accent-subtle/20 border border-white/20">
          <div className="space-y-8">
            {/* Name Input */}
            <div className="space-y-3">
              <label htmlFor="hostName" className="block text-sm font-bold ml-1 text-text/80">
                Your Name
              </label>
              <input
                type="text"
                id="hostName"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-6 py-4 rounded-2xl bg-bg/50 border-2 border-transparent focus:border-accent/50 focus:bg-bg focus:ring-4 focus:ring-accent-subtle transition-all duration-300 outline-none text-lg font-medium placeholder:text-text/30"
                maxLength={50}
                disabled={loading}
              />
            </div>

            {/* Theme Selector */}
            <div className="space-y-4">
              <label className="block text-sm font-bold ml-1 text-text/80">
                Choose a Vibe
              </label>
              <div className="flex justify-between items-center px-2">
                {themes.map((theme) => (
                  <ThemeSwatch
                    key={theme.id}
                    theme={theme}
                    isSelected={selectedTheme === theme.id}
                    onSelect={() => setSelectedTheme(theme.id)}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-warning/20 text-warning rounded-2xl text-sm font-bold text-center border border-warning/20">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="pt-2 flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-4 rounded-2xl font-bold text-text/60 hover:bg-bg/50 hover:text-text transition-all duration-300"
                disabled={loading}
              >
                Back
              </button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 30px -10px var(--accent)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                className="flex-1 bg-accent text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </span>
                ) : (
                  'Create Room'
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ThemeSwatch({
  theme,
  isSelected,
  onSelect
}: {
  theme: { id: Theme; color: string; label: string };
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        onClick={onSelect}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          scale: isSelected ? 1.1 : 1,
        }}
        className={`w-12 h-12 rounded-full cursor-pointer relative transition-all duration-300`}
        style={{
          backgroundColor: theme.color,
          boxShadow: isSelected
            ? `0 0 0 4px var(--bg), 0 0 0 6px ${theme.color}`
            : 'none'
        }}
        aria-label={`Select ${theme.label} theme`}
      >
        {isSelected && (
          <motion.div
            layoutId="checkmark"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </motion.div>
        )}
      </motion.button>
      <span className={`text-xs font-bold transition-colors duration-300 ${isSelected ? 'text-text' : 'text-text/40'}`}>
        {theme.label}
      </span>
    </div>
  );
}
