'use client';

import { useState } from 'react';
import Logo from '../Logo';
import type { Room } from '@/types';

interface RoomHeaderProps {
  room: Room;
  onShareClick: () => void;
  onChatClick: () => void;
  chatOpen: boolean;
}

export default function RoomHeader({ room, onShareClick, onChatClick, chatOpen }: RoomHeaderProps) {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleLogoClick = () => {
    setShowExitDialog(true);
  };

  const handleExit = () => {
    window.location.href = '/';
  };

  return (
    <>
      <header className="border-b border-accent-subtle/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div onClick={handleLogoClick} className="cursor-pointer">
            <Logo size="small" />
          </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm px-3 py-1 bg-card rounded-lg border border-accent-subtle">
            <span className="opacity-60">Room:</span>{' '}
            <span className="font-mono font-semibold">{room.code}</span>
          </div>
          
          <button
            onClick={(e) => {
              const url = `${window.location.origin}/join?code=${room.code}`;
              navigator.clipboard.writeText(url).then(() => {
                const btn = e.currentTarget;
                const originalText = btn.textContent;
                btn.textContent = '✓ Link Copied!';
                btn.classList.add('bg-green-500/20', 'text-green-600');
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.classList.remove('bg-green-500/20', 'text-green-600');
                }, 2500);
              });
            }}
            className="btn-ghost px-3 py-1 text-sm transition-colors"
            title="Copy invite link with room code"
          >
            🔗 Share
          </button>
          
          <button
            onClick={onChatClick}
            className={`btn-ghost px-3 py-1 text-sm ${chatOpen ? 'bg-accent-subtle' : ''}`}
            title="Toggle chat"
          >
            💬 Chat
          </button>
        </div>
      </div>
    </header>

    {/* Exit Confirmation Dialog */}
    {showExitDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="card max-w-sm mx-4 text-center space-y-4 animate-fade-in">
          <h3 className="text-xl font-semibold">Leave Room?</h3>
          <p className="text-sm opacity-80">Do you want to return to the main screen?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowExitDialog(false)}
              className="btn-secondary px-6"
            >
              No
            </button>
            <button
              onClick={handleExit}
              className="btn-primary px-6"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

