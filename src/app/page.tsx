'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import AdBanner from '@/components/AdBanner';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gradient-overlay">
      {/* Header Ad */}
      <AdBanner />
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <Logo size="large" />
        
        <p className="text-xl opacity-80">
          A clean, privacy-first Pomodoro timer for solo or group focus sessions
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={() => router.push('/create')}
            className="btn-primary text-lg px-8 py-4"
          >
            New Room
          </button>
          <button
            onClick={() => router.push('/join')}
            className="btn-secondary text-lg px-8 py-4"
          >
            Join Room
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-accent-subtle/20">
          <p className="text-sm opacity-60">
            No login required • Privacy-first • Real-time sync
          </p>
        </div>
      </div>
      {/* Footer Ad */}
      <AdBanner />
    </div>
  );
}

