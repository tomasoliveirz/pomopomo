import type { Participant } from '@/types';
import { useState } from 'react';

interface MemberListProps {
  participants: Participant[];
}

// Custom Crown Icon Component
const CrownIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-sm"
  >
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill="#FFD700"
      stroke="#B8860B"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2" fill="white" fillOpacity="0.6" />
  </svg>
);

export default function MemberList({ participants }: MemberListProps) {
  const [showAll, setShowAll] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-rose-300',
      'bg-orange-300',
      'bg-amber-300',
      'bg-emerald-300',
      'bg-teal-300',
      'bg-cyan-300',
      'bg-indigo-300',
      'bg-fuchsia-300',
    ];
    return colors[index % colors.length];
  };

  // Limitar a 8 avatares visíveis + contador
  const maxVisible = 8;
  const visibleParticipants = showAll ? participants : participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  return (
    <div className="w-full max-w-2xl flex flex-col items-center">
      {/* Header - Pill Style */}
      <div className="mb-4">
        <div className="bg-white/50 px-4 py-1 rounded-full text-sm font-bold text-gray-500 shadow-sm backdrop-blur-sm flex items-center gap-2">
          <span>👥</span>
          <span>
            {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          </span>
        </div>
      </div>

      {/* Avatar Stack - Chunky Bubbles */}
      <div className="flex items-center justify-center">
        <div className="flex items-center -space-x-4 p-2">
          {visibleParticipants.map((participant, index) => {
            const isHost = participant.role === 'host';

            return (
              <div
                key={participant.id}
                className="group relative"
              >
                {/* Avatar */}
                <div
                  className={`
                    w-14 h-14 rounded-full ${getAvatarColor(index)} 
                    text-white flex items-center justify-center 
                    text-lg font-bold font-display border-4 border-white/50
                    shadow-md shadow-black/5
                    transition-all duration-300 
                    group-hover:scale-110 group-hover:rotate-3 group-hover:z-10
                    cursor-pointer relative
                  `}
                >
                  <span className="drop-shadow-md">{getInitials(participant.displayName)}</span>

                  {/* Crown for Host */}
                  {isHost && (
                    <div className="absolute -top-3 -right-1 rotate-12 z-20 animate-bounce-slow">
                      <CrownIcon />
                    </div>
                  )}
                </div>

                {/* Kawaii Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                  <div className="bg-white text-gray-600 text-xs font-bold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center gap-1">
                      <span>{participant.displayName}</span>
                      {isHost && <span>👑</span>}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 bg-white rotate-45 rounded-sm"></div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more button */}
          {!showAll && remainingCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-14 h-14 rounded-full bg-white/80 text-gray-500 flex items-center justify-center text-sm font-bold border-4 border-white/50 shadow-md hover:scale-110 hover:rotate-3 transition-all duration-300 cursor-pointer z-0 relative hover:z-10"
              title={`+${remainingCount} more`}
            >
              +{remainingCount}
            </button>
          )}
        </div>

        {/* Show less button */}
        {showAll && remainingCount > 0 && (
          <button
            onClick={() => setShowAll(false)}
            className="ml-4 text-xs font-bold text-white/70 hover:text-white bg-black/20 hover:bg-black/30 px-3 py-1 rounded-full transition-colors"
          >
            Show less
          </button>
        )}
      </div>

      {/* Expanded List View - Only if needed */}
      {showAll && participants.length > maxVisible && (
        <div className="mt-4 p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 max-h-48 overflow-y-auto w-full animate-fade-in-down">
          <div className="grid grid-cols-2 gap-3">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/30 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full ${getAvatarColor(index)} text-white flex items-center justify-center text-xs font-bold border-2 border-white/50 shadow-sm shrink-0`}
                >
                  {getInitials(participant.displayName)}
                </div>
                <span className="truncate text-sm font-medium text-white mix-blend-overlay">{participant.displayName}</span>
                {participant.role === 'host' && (
                  <span className="text-xs">👑</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

