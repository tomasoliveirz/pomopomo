"use client";

import { useState } from 'react';
import Logo from '@/components/Logo';
import SharePopup from '@/components/SharePopup';
import type { Room } from '@/types';

interface RoomHeaderClientProps {
    room: Room;
    onShareClick?: () => void;
    onReportClick: () => void;
    children?: React.ReactNode; // Slot for UserMenu
}

export default function RoomHeaderClient({
    room,
    onShareClick, // kept for compatibility if needed, but we use internal state
    onReportClick,
    children
}: RoomHeaderClientProps) {
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [showSharePopup, setShowSharePopup] = useState(false);

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
                        <span className="opacity-60">Room:</span>{' '}
                        <span className="font-mono font-semibold">{room.code}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Render UserMenu slot here */}
                        {children}

                        <button
                            onClick={onReportClick}
                            className="btn-ghost px-3 py-1 text-sm transition-colors text-text/60 hover:text-text"
                            title="Report a bug"
                        >
                            🐛 Report
                        </button>

                        <button
                            onClick={() => setShowSharePopup(true)}
                            className="btn-ghost px-3 py-1 text-sm transition-colors"
                            title="Share room link"
                        >
                            🔗 Share
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

            {/* Share Popup */}
            {showSharePopup && (
                <SharePopup
                    shareUrl={`${window.location.origin}/join?code=${room.code}`}
                    onClose={() => setShowSharePopup(false)}
                />
            )}
        </>
    );
}
