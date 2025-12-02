'use client';

import { useState, useEffect } from 'react';
import type { Segment, SegmentKind, Task, Role } from '@/types';
import type { Socket } from 'socket.io-client';
import { getCustomIntervals } from '../IntervalCustomizer';
import InlineSegmentSheet from './InlineSegmentSheet';

import { usePersistentIntervals } from '@/hooks/useIntervals';

interface QueuePanelProps {
  segments: Segment[];
  currentIndex: number;
  segmentTasks: Record<string, Task[]>;
  role: Role;
  socket: Socket | null;
  participantId: string;
  roomId: string;
  timerState: {
    status: string;
    currentIndex: number;
    segmentEndsAt: number | null;
    remainingSec?: number;
  } | null;
  onClose: () => void;
}

export default function QueuePanel({
  segments,
  currentIndex,
  segmentTasks,
  role,
  socket,
  participantId,
  roomId,
  timerState,
  onClose,
}: QueuePanelProps) {
  const intervals = usePersistentIntervals();
  const [editMode, setEditMode] = useState(false);
  const [localSegments, setLocalSegments] = useState<Segment[]>(segments);
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);


  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);

  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);

  // Dynamic presets from hook
  const segmentPresets = [
    { kind: 'focus', label: 'Focus', durationSec: intervals.focusDuration * 60, emoji: '🎯' },
    { kind: 'break', label: 'Short Break', durationSec: intervals.shortBreakDuration * 60, emoji: '☕' },
    { kind: 'long_break', label: 'Long Break', durationSec: intervals.longBreakDuration * 60, emoji: '🌴' },
    { kind: 'custom', label: 'Custom', durationSec: 10 * 60, emoji: '✨' },
  ] as const;

  const addSegment = (preset: { kind: SegmentKind; label: string; durationSec: number; emoji: string }) => {
    const newSegment: Segment = {
      id: `temp-${Date.now()}`,
      kind: preset.kind,
      label: preset.label,
      durationSec: preset.durationSec,
      order: localSegments.length,
    };
    setLocalSegments([...localSegments, newSegment]);
  };

  const removeSegment = (index: number) => {
    setLocalSegments(localSegments.filter((_, i) => i !== index));
  };

  const updateSegment = (index: number, updates: Partial<Segment>) => {
    const updated = [...localSegments];
    updated[index] = { ...updated[index], ...updates };
    setLocalSegments(updated);
  };

  const saveQueue = () => {
    if (!socket) return;

    const segmentsToSave = localSegments.map((seg, index) => ({
      ...seg,
      order: index,
    }));

    socket.emit('queue:replace', { segments: segmentsToSave }, (ok: boolean) => {
      if (ok) {
        setEditMode(false);
      }
    });
  };

  const cancelEdit = () => {
    setLocalSegments(segments);
    setEditMode(false);
  };

  // Show all segments (not filtered by currentIndex)
  const displaySegments = editMode ? localSegments : segments;

  const getMyPrivateTask = (segmentId: string): string | undefined => {
    const tasks = segmentTasks[segmentId] || [];
    const myTask = tasks.find(
      (t) => t.participantId === participantId && t.visibility === 'private'
    );
    return myTask?.text;
  };

  // Calculate predicted end time for a segment
  const getPredictedEndTime = (segmentIndex: number): string | null => {
    if (editMode) return null;

    const segsToUse = displaySegments;

    // If segment is in the past, don't show time
    if (segmentIndex < currentIndex) return null;

    let baseTime: number;

    if (segmentIndex === currentIndex) {
      // Current segment: use segmentEndsAt if available
      if (timerState?.segmentEndsAt) {
        baseTime = timerState.segmentEndsAt;
      } else {
        // Fallback: calculate from now
        baseTime = Date.now() + (segsToUse[segmentIndex]?.durationSec || 0) * 1000;
      }
    } else {
      // Future segments: calculate from current segment's end
      if (timerState?.segmentEndsAt) {
        baseTime = timerState.segmentEndsAt;
      } else {
        // If no timer state, start from now
        baseTime = Date.now();
        if (currentIndex < segsToUse.length) {
          baseTime += (segsToUse[currentIndex]?.durationSec || 0) * 1000;
        }
      }

      // Add durations of all segments between current and this one
      for (let i = currentIndex + 1; i <= segmentIndex; i++) {
        if (i < segsToUse.length) {
          baseTime += (segsToUse[i]?.durationSec || 0) * 1000;
        }
      }
    }

    // Format time in local timezone
    const endDate = new Date(baseTime);
    return endDate.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-white/40 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-bold text-2xl font-display tracking-tight text-text/90">Queue</h3>
          <p className="text-xs font-medium opacity-50 mt-1">
            {role === 'host' ? 'Everyone can see • You can edit' : 'Visible to everyone'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors text-lg"
        >
          ✕
        </button>
      </div>

      {/* Segments List - Scrollable area (flex-1 ocupa todo espaço disponível) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 overscroll-contain [scrollbar-gutter:stable]">
        {displaySegments.length === 0 && (
          <div className="text-center py-8 text-sm opacity-60">
            {role === 'host' ? (
              <>
                <div className="text-4xl mb-2 opacity-50">✨</div>
                <p>Add segments to build your focus queue</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2 opacity-50">⏳</div>
                <p>Waiting for host to build the queue...</p>
              </>
            )}
          </div>
        )}

        {displaySegments.map((segment, displayIndex) => {
          const isExpanded = expandedSegmentId === segment.id;
          const isCurrent = displayIndex === currentIndex && !editMode;
          const isPast = displayIndex < currentIndex && !editMode;

          return (
            <div
              key={segment.id}
              className={`
                card p-3 space-y-2 transition-all
                ${isPast ? 'opacity-40' : 'opacity-100'}
                ${isCurrent ? 'ring-2 ring-accent' : ''}
                ${!editMode && !isPast ? 'cursor-pointer hover:shadow-md' : ''}
              `}
              onClick={() => {
                if (!editMode && !isPast) {
                  setExpandedSegmentId(isExpanded ? null : segment.id);
                }
              }}
            >
              {editMode ? (
                /* Edit Mode */
                <>
                  <input
                    type="text"
                    value={segment.label}
                    onChange={(e) => updateSegment(displayIndex, { label: e.target.value })}
                    className="input text-sm py-1"
                    placeholder="Segment label"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={Math.floor(segment.durationSec / 60)}
                      onChange={(e) =>
                        updateSegment(displayIndex, { durationSec: parseInt(e.target.value) * 60 })
                      }
                      className="input text-sm py-1 w-20"
                      min="1"
                      max="120"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm self-center">min</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSegment(displayIndex);
                      }}
                      className="btn-ghost text-sm px-2 py-1 ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <span>{segment.label}</span>
                        {isPast && <span className="text-xs opacity-60">✓ Done</span>}
                      </div>
                      <div className="text-xs opacity-60 flex items-center gap-2">
                        <span>{Math.floor(segment.durationSec / 60)} min</span>
                        {getPredictedEndTime(displayIndex) && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-accent">
                              Ends at {getPredictedEndTime(displayIndex)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-accent text-white px-2 py-1 rounded font-medium">
                        Now
                      </span>
                    )}
                  </div>

                  {/* Public Task Badge */}
                  {segment.publicTask && (
                    <div className="pt-2 border-t border-accent-subtle/10">
                      <div className="flex items-start gap-2">
                        <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded shrink-0">
                          Public
                        </span>
                        <p className="text-xs opacity-80 flex-1">{segment.publicTask}</p>
                      </div>
                    </div>
                  )}

                  {/* Private Task Indicator */}
                  {getMyPrivateTask(segment.id) && (
                    <div className="pt-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded shrink-0">
                          Private
                        </span>
                        <p className="text-xs opacity-80 flex-1">{getMyPrivateTask(segment.id)}</p>
                      </div>
                    </div>
                  )}

                  {/* Click hint */}
                  {!isPast && !isExpanded && (
                    <div className="text-xs opacity-40 text-center pt-1">
                      Click to {segment.publicTask || getMyPrivateTask(segment.id) ? 'edit' : 'add'}{' '}
                      tasks
                    </div>
                  )}

                  {/* Inline Task Editor */}
                  {isExpanded && !isPast && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <InlineSegmentSheet
                        segment={segment}
                        role={role}
                        socket={socket}
                        roomId={roomId}
                        participantId={participantId}
                        myPrivateTask={getMyPrivateTask(segment.id)}
                        onClose={() => setExpandedSegmentId(null)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Host Controls */}
      {role === 'host' && (
        <div className="p-4 border-t border-accent-subtle/20 space-y-3 shrink-0">
          {editMode ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {segmentPresets.map((preset) => (
                  <button
                    key={preset.kind}
                    onClick={() => addSegment(preset)}
                    className="btn-ghost text-xs p-2 flex flex-col items-center gap-1"
                  >
                    <div className="text-lg">{preset.emoji}</div>
                    <div className="text-xs">{preset.label}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="btn-ghost flex-1 text-sm">
                  Cancel
                </button>
                <button onClick={saveQueue} className="btn-primary flex-1 text-sm">
                  Save Queue
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-secondary w-full text-sm">
              ✏️ Edit Queue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
