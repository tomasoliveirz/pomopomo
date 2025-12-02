'use client';

import { useState, useEffect, useRef } from 'react';
import Logo from '../Logo';
import type { Segment, RoomStatus } from '@/types';
import type { Socket } from 'socket.io-client';
import { useAlarm } from '@/hooks/useAlarm';

interface TimerCardProps {
  currentSegment?: Segment;
  segments: Segment[];
  timerState: {
    status: RoomStatus;
    currentIndex: number;
    segmentEndsAt: number | null;
    remainingSec?: number;
  } | null;
  isHost: boolean;
  socket: Socket | null;
}

export default function TimerCard({ currentSegment, segments, timerState, isHost, socket }: TimerCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAlarm, initAudioContext } = useAlarm();
  const previousTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!timerState) return;

    if (timerState.status === 'running' && timerState.segmentEndsAt) {
      let alarmPlayed = false; // Track if alarm was already played

      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((timerState.segmentEndsAt! - now) / 1000));

        // Only update if time actually changed (avoid unnecessary re-renders)
        if (remaining !== previousTimeRef.current) {
          setTimeRemaining(remaining);
          previousTimeRef.current = remaining;
        }

        // Play alarm when timer reaches 0 (only once)
        if (remaining === 0 && !alarmPlayed && currentSegment) {
          alarmPlayed = true;
          const alarmType = currentSegment.kind === 'focus' ? 'break' : 'focus';
          playAlarm(alarmType);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else if (timerState.status === 'paused' && timerState.remainingSec !== undefined) {
      setTimeRemaining(timerState.remainingSec);
    } else if (timerState.status === 'idle' && currentSegment) {
      setTimeRemaining(currentSegment.durationSec);
    } else {
      setTimeRemaining(0);
    }
  }, [timerState, currentSegment, playAlarm]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSegmentColor = (kind?: string) => {
    switch (kind) {
      case 'focus':
        return 'text-accent';
      case 'break':
        return 'text-success';
      case 'long_break':
        return 'text-warning';
      default:
        return 'text-text';
    }
  };

  const handlePlay = () => {
    // Initialize AudioContext on user interaction (browser autoplay policy)
    initAudioContext();
    socket?.emit('queue:play', {});
  };

  const handlePause = () => {
    socket?.emit('queue:pause');
  };

  const handleSkip = () => {
    // Play alarm when manually skipping
    if (currentSegment) {
      const alarmType = currentSegment.kind === 'focus' ? 'break' : 'focus';
      playAlarm(alarmType);
    }
    socket?.emit('queue:skip');
  };

  if (!currentSegment) {
    return (
      <div className="card max-w-2xl w-full text-center">
        {/* colocar isto animado muito lento mas um pulse mesmo leve  */}
        <div className="mb-2 animate-pulse-slow">
          {/* centralizar o logo no meio */}
          <img src="/branding/logo.svg" className="w-16 h-16 mx-auto" />
        </div>
        {/* colocar este texto bem mais pequeno */}
        <p className="text-sm opacity-60">No segments in queue</p>
        {isHost && (
          <p className="text-xs mt-2 opacity-60">Use the Queue Builder to add segments</p>
        )}
      </div>
    );
  }

  return (
    <div className="card max-w-2xl w-full gradient-overlay">
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">{currentSegment.label}</h2>
        </div>

        <div className="text-7xl font-bold font-mono tracking-tight">
          {formatTime(timeRemaining)}
        </div>

        <div className="flex items-center justify-center gap-4 text-sm opacity-60">
          <span className={`inline-block w-2 h-2 rounded-full ${timerState?.status === 'running' ? 'bg-success animate-pulse-slow' :
            timerState?.status === 'paused' ? 'bg-warning' :
              'bg-text/20'
            }`} />
          <span className="capitalize">{timerState?.status || 'idle'}</span>
        </div>

        {isHost && (
          <div className="flex items-center justify-center gap-3 pt-4">
            {timerState?.status === 'running' ? (
              <>
                <button onClick={handlePause} className="btn-secondary px-6">
                  ⏸ Pause
                </button>
                <button onClick={handleSkip} className="btn-secondary px-6">
                  ⏭ Skip
                </button>
              </>
            ) : (
              <>
                <button onClick={handlePlay} className="btn-primary px-8">
                  ▶ {timerState?.status === 'paused' ? 'Resume' : 'Start'}
                </button>
                {segments.length > 1 && (
                  <button onClick={handleSkip} className="btn-secondary px-6">
                    ⏭ Skip
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

