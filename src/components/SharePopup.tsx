'use client';

import { useState } from 'react';

interface SharePopupProps {
  shareUrl: string;
  onClose: () => void;
}

export default function SharePopup({ shareUrl, onClose }: SharePopupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Join my Pomodoro room! ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="card max-w-md mx-4 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">Share Room</h3>
          <button
            onClick={onClose}
            className="text-2xl opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm opacity-80 mb-4">
          Invite others to join your Pomodoro session
        </p>

        {/* Share buttons grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-accent-subtle hover:bg-accent-subtle/10 transition-colors"
          >
            <img
              src="/icons/whatsapp-logo.png"
              alt="WhatsApp"
              className="w-12 h-12 object-contain"
            />
            <span className="text-sm font-medium">WhatsApp</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${copied
                ? 'bg-green-500/20 border-green-500 text-green-600'
                : 'border-accent-subtle hover:bg-accent-subtle/10'
              }`}
          >
            <div className="text-3xl">{copied ? '✓' : '🔗'}</div>
            <span className="text-sm font-medium">
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

