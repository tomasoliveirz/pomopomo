"use client";

import { Suspense } from 'react';
import JoinRoom from '@/components/JoinRoom';
import AdBanner from '@/components/AdBanner';

export default function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AdBanner />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-4xl animate-pulse-slow">🍅</div>
        </div>
      }>
        <JoinRoom />
      </Suspense>
      <AdBanner />
    </div>
  );
}


