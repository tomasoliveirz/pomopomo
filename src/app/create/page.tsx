"use client";

import RoomCreator from '@/components/RoomCreator';
import AdBanner from '@/components/AdBanner';

export default function CreatePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <RoomCreator />
      <AdBanner />
    </div>
  );
}


