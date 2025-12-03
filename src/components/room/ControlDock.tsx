'use client';

import { useState } from 'react';

interface ControlDockProps {
    onToggleQueue: () => void;
    onToggleChat: () => void;
    onToggleWhiteboard: () => void;
    onOpenSettings: () => void;
    queueOpen: boolean;
    chatOpen: boolean;
    whiteboardOpen: boolean;
    unreadMessages?: number;
}

export default function ControlDock({
    onToggleQueue,
    onToggleChat,
    onToggleWhiteboard,
    onOpenSettings,
    queueOpen,
    chatOpen,
    whiteboardOpen,
    unreadMessages = 0,
}: ControlDockProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="flex items-center gap-4 px-6 py-3 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/40">

                {/* Queue Toggle */}
                <DockItem
                    label="Queue"
                    icon="📋"
                    active={queueOpen}
                    onClick={onToggleQueue}
                />

                {/* Chat Toggle */}
                <DockItem
                    label="Chat"
                    icon="💬"
                    active={chatOpen}
                    onClick={onToggleChat}
                    badge={unreadMessages}
                />

                {/* Whiteboard Toggle */}
                <DockItem
                    label="Draw"
                    icon="🎨"
                    active={whiteboardOpen}
                    onClick={onToggleWhiteboard}
                />

                {/* Separator */}
                <div className="w-px h-8 bg-black/5 mx-1" />

                {/* Settings */}
                <DockItem
                    label="Settings"
                    icon="⚙️"
                    onClick={onOpenSettings}
                />
            </div>
        </div>
    );
}

function DockItem({
    label,
    icon,
    active,
    onClick,
    badge,
}: {
    label: string;
    icon: string;
    active?: boolean;
    onClick: () => void;
    badge?: number;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
        relative group flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300
        ${active ? 'bg-accent/10 text-accent' : 'hover:bg-black/5 text-text/70'}
        ${hovered ? 'scale-110' : 'scale-100'}
      `}
        >
            <span className="text-2xl filter drop-shadow-sm">{icon}</span>

            {/* Tooltip */}
            <span className={`
        absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none transition-all duration-200
        ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
                {label}
            </span>

            {/* Badge */}
            {badge ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full shadow-sm animate-bounce">
                    {badge > 9 ? '9+' : badge}
                </span>
            ) : null}

            {/* Active Indicator */}
            {active && (
                <span className="absolute -bottom-1 w-1 h-1 bg-accent rounded-full" />
            )}
        </button>
    );
}
