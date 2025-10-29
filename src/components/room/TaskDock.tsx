'use client';

import { useState, useEffect } from 'react';
import type { Segment, Visibility } from '@/types';
import type { Socket } from 'socket.io-client';

interface TaskDockProps {
  currentSegment?: Segment;
  participantId: string;
  socket: Socket | null;
}

export default function TaskDock({ currentSegment, participantId, socket }: TaskDockProps) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Listen for task updates
    if (!socket) return;

    const handleTaskUpdate = (data: any) => {
      if (data.participantId === participantId && data.segmentId === currentSegment?.id) {
        setText(data.patch.text || '');
        setVisibility(data.patch.visibility || 'private');
      }
    };

    socket.on('task:updated', handleTaskUpdate);

    return () => {
      socket.off('task:updated', handleTaskUpdate);
    };
  }, [socket, participantId, currentSegment]);

  // Reset when segment changes
  useEffect(() => {
    setText('');
    setSaved(false);
  }, [currentSegment?.id]);

  const handleSave = () => {
    if (!socket || !currentSegment || !text.trim()) return;

    socket.emit('task:set', {
      segmentId: currentSegment.id,
      text: text.trim(),
      visibility,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!currentSegment) return null;

  return (
    <div className="card max-w-2xl w-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Your task for this segment</label>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setVisibility('private')}
              className={`px-2 py-1 rounded ${
                visibility === 'private' ? 'bg-accent text-white' : 'bg-card'
              }`}
            >
              🔒 Private
            </button>
            <button
              onClick={() => setVisibility('public')}
              className={`px-2 py-1 rounded ${
                visibility === 'public' ? 'bg-accent text-white' : 'bg-card'
              }`}
            >
              👁️ Public
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add your task..."
            className="input flex-1"
            maxLength={500}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="btn-primary px-4"
          >
            {saved ? '✓' : 'Save'}
          </button>
        </div>

        <div className="text-xs opacity-60">
          {visibility === 'private' ? 'Only you can see this task' : 'Everyone in the room can see this task'}
        </div>
      </div>
    </div>
  );
}





