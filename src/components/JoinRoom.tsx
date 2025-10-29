'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from './Logo';

export default function JoinRoom() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code');
  
  const [code, setCode] = useState(urlCode || '');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCodeLocked, setIsCodeLocked] = useState(!!urlCode);
  const router = useRouter();

  useEffect(() => {
    // Se o código vier da URL, bloquear e focar no nome
    if (urlCode) {
      setCode(urlCode);
      setIsCodeLocked(true);
      // Focar no input de nome após um pequeno delay
      setTimeout(() => {
        document.getElementById('displayName')?.focus();
      }, 100);
    }
  }, [urlCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !displayName.trim()) {
      setError('Please enter both room code and display name');
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

      if (!result.success) {
        throw new Error(result.error || 'Failed to join room');
      }

      // Store WS token in localStorage
      localStorage.setItem('wsToken', result.data.wsToken);
      
      // Redirect to room
      router.push(`/room/${code.trim()}`);
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
          <h2 className="mt-4 text-2xl font-semibold">Join a Room</h2>
          {isCodeLocked && (
            <p className="mt-2 text-sm opacity-70">
              You've been invited to room <span className="font-mono font-semibold">{code}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleJoin} className="card space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Room Code {isCodeLocked && <span className="text-xs opacity-60">🔒</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., pomo-7QRX"
                className={`input ${isCodeLocked ? 'bg-accent-subtle/30 cursor-not-allowed' : ''}`}
                disabled={loading || isCodeLocked}
                readOnly={isCodeLocked}
              />
              {isCodeLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCodeLocked(false);
                    setCode('');
                    document.getElementById('code')?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent hover:underline"
                  title="Change room code"
                >
                  Change
                </button>
              )}
            </div>
            {isCodeLocked && (
              <p className="mt-1 text-xs opacity-60">
                Room code is locked. Click "Change" to enter a different code.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input"
              maxLength={50}
              disabled={loading}
            />
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
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

