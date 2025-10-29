'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import type { Theme } from '@/types';

const themes: { value: Theme; label: string; emoji: string }[] = [
  { value: 'midnight_bloom', label: 'Midnight Bloom', emoji: '🌙' },
  { value: 'lilac_mist', label: 'Lilac Mist', emoji: '💜' },
  { value: 'solar_cream', label: 'Solar Cream', emoji: '☀️' },
  { value: 'verdant_dew', label: 'Verdant Dew', emoji: '🌱' },
  { value: 'sakura_ink', label: 'Sakura Ink', emoji: '🌸' },
  { value: 'arctic_drift', label: 'Arctic Drift', emoji: '🧊' },
  { value: 'amber_dusk', label: 'Amber Dusk', emoji: '🌇' },
  { value: 'coral_velvet', label: 'Coral Velvet', emoji: '🪸' },
  { value: 'noir_mint', label: 'Noir Mint', emoji: '🍃' },
];

export default function RoomCreator() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('midnight_bloom');
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
      console.log('🎯 CREATE SUCCESS - Storing in localStorage:');
      console.log('  - wsToken:', result.data.wsToken.substring(0, 50) + '...');
      console.log('  - participantId:', result.data.participant.id);
      console.log('  - roomCode:', result.data.room.code);
      console.log('  - role:', result.data.participant.role);
      
      localStorage.setItem('wsToken', result.data.wsToken);
      localStorage.setItem('participantId', result.data.participant.id);
      localStorage.setItem('roomCode', result.data.room.code);
      
      console.log('✅ Saved to localStorage, redirecting to:', `/room/${result.data.room.code}`);
      
      // Redirect to room
      router.push(`/room/${result.data.room.code}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gradient-overlay">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <Logo size="medium" />
          <h2 className="mt-4 text-2xl font-semibold">Create a New Room</h2>
        </div>

        <div className="card space-y-6">
          <div>
            <label htmlFor="hostName" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="hostName"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Enter your name"
              className="input"
              maxLength={50}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Choose a Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSelectedTheme(theme.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.value
                      ? 'border-accent bg-accent-subtle'
                      : 'border-accent-subtle hover:border-accent'
                  }`}
                >
                  <div className="text-xl mb-1">{theme.emoji}</div>
                  <div className="text-xs font-medium">{theme.label}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-warning/10 border border-warning rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-ghost flex-1"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

