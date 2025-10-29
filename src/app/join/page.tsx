import { Suspense } from 'react';
import JoinRoom from '@/components/JoinRoom';

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse-slow">🍅</div>
      </div>
    }>
      <JoinRoom />
    </Suspense>
  );
}


