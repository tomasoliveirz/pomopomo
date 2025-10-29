import type { Participant } from '@/types';
import { useState } from 'react';

interface MemberListProps {
  participants: Participant[];
  hostSessionId: string;
}

export default function MemberList({ participants, hostSessionId }: MemberListProps) {
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
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    return colors[index % colors.length];
  };

  // Limitar a 8 avatares visíveis + contador
  const maxVisible = 8;
  const visibleParticipants = showAll ? participants : participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-sm opacity-60">👥</span>
        <span className="text-sm font-medium">
          {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
        </span>
      </div>

      {/* Avatar Stack - Compact Design */}
      <div className="flex items-center justify-center">
        <div className="flex items-center -space-x-3">
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
                    w-12 h-12 rounded-full ${getAvatarColor(index)} 
                    text-white flex items-center justify-center 
                    text-sm font-semibold border-2 border-background
                    shadow-md transition-transform hover:scale-110 hover:z-10
                    cursor-pointer
                    ${isHost ? 'ring-2 ring-yellow-400' : ''}
                  `}
                  title={participant.displayName}
                >
                  {getInitials(participant.displayName)}
                  {isHost && (
                    <span className="absolute -top-1 -right-1 text-xs">👑</span>
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                    <div className="font-medium">{participant.displayName}</div>
                    {isHost && (
                      <div className="text-yellow-300 text-[10px]">👑 Host</div>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more button */}
          {!showAll && remainingCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-12 h-12 rounded-full bg-accent-subtle text-foreground flex items-center justify-center text-xs font-semibold border-2 border-background shadow-md hover:scale-110 transition-transform cursor-pointer z-10"
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
            className="ml-3 text-xs text-accent hover:underline"
          >
            Show less
          </button>
        )}
      </div>

      {/* Expanded List View */}
      {showAll && participants.length > maxVisible && (
        <div className="mt-4 p-3 bg-card/50 rounded-lg border border-accent-subtle/20 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className={`w-6 h-6 rounded-full ${getAvatarColor(index)} text-white flex items-center justify-center text-[10px] font-semibold shrink-0`}
                >
                  {getInitials(participant.displayName)}
                </div>
                <span className="truncate">{participant.displayName}</span>
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

