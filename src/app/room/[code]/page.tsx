'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { AnimatePresence } from 'framer-motion';
import RoomHeader from '@/components/room/RoomHeader';
import Logo from '@/components/Logo';
import TimerCard from '@/components/room/TimerCard';
import QueuePanel from '@/components/room/QueuePanel';
import ChatDrawer from '@/components/room/ChatDrawer';
import MemberList from '@/components/room/MemberList';
import IntervalCustomizer from '@/components/IntervalCustomizer';
import AlertsSettings from '@/components/AlertsSettings';
import Toast from '@/components/Toast';
import ControlDock from '@/components/room/ControlDock';
import RoomSettingsModal from '@/components/room/RoomSettingsModal';
import Whiteboard from '@/components/room/Whiteboard';
import { handleSegmentEnd } from '@/alerts/engine';
import type { Room, Participant, Segment, Message, RoomStatus } from '@/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [segmentTasks, setSegmentTasks] = useState<Record<string, any[]>>({});
  const [timerState, setTimerState] = useState<{
    status: RoomStatus;
    currentIndex: number;
    segmentEndsAt: number | null;
    remainingSec?: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'timer' | 'sounds'>('timer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);

  // Handle direct join via URL
  const handleDirectJoin = async () => {
    if (!joinName.trim()) {
      setError('Please enter your name');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: joinName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      // Store tokens
      localStorage.setItem('wsToken', data.data.wsToken);
      localStorage.setItem('participantId', data.data.participant.id);
      localStorage.setItem('roomCode', code);

      // Reload page to connect with new token
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      setJoining(false);
    }
  };

  useEffect(() => {
    const wsToken = localStorage.getItem('wsToken');
    const participantId = localStorage.getItem('participantId');
    const roomCode = localStorage.getItem('roomCode');

    if (!wsToken) {
      // Show join form instead of redirecting
      setShowJoinForm(true);
      setLoading(false);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    const newSocket = io(wsUrl, {
      auth: { token: wsToken },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setLoading(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setError('Failed to connect to room');
      setLoading(false);
    });

    newSocket.on('room:joined', (data) => {
      setRoom(data.room);
      setMe(data.me);
      setParticipants(data.participants);
      setSegments(data.queue);
      setMessages(data.messages);
      setLoading(false);
    });

    let lastSegmentIndex = -1;

    newSocket.on('room:state', (data) => {
      // Check if segment just ended (index increased)
      if (data.currentIndex > lastSegmentIndex && lastSegmentIndex >= 0) {
        handleSegmentEnd();
      }
      lastSegmentIndex = data.currentIndex;
      setTimerState(data);
      if (room) {
        setRoom({ ...room, status: data.status, currentSegmentIndex: data.currentIndex });
      }
    });

    newSocket.on('queue:updated', (data) => {
      setSegments(data.segments);
    });

    newSocket.on('queue:snapshot', (data) => {
      setSegments(data.segments);
    });

    newSocket.on('segment:consumed', (data) => {
      // Segment was consumed (manual skip or auto-advance)
      handleSegmentEnd();
    });

    // Heartbeat: respond to ping with pong
    newSocket.on('ping', () => {
      newSocket.emit('pong');
    });

    newSocket.on('task:private:updated', (data) => {
      // Update private task in segmentTasks
      setSegmentTasks((prev) => {
        const tasks = prev[data.segmentId] || [];
        const existingIndex = tasks.findIndex(
          (t) => t.participantId === data.participantId && t.visibility === 'private'
        );

        const newTask = {
          id: `${data.segmentId}-${data.participantId}`,
          segmentId: data.segmentId,
          participantId: data.participantId,
          text: data.text,
          visibility: 'private' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          const updatedTasks = [...tasks];
          updatedTasks[existingIndex] = newTask;
          return { ...prev, [data.segmentId]: updatedTasks };
        } else {
          return { ...prev, [data.segmentId]: [...tasks, newTask] };
        }
      });
    });

    newSocket.on('task:public:updated', (data) => {
      // Update segment with public task
      setSegments((prev) =>
        prev.map((seg) =>
          seg.id === data.segmentId ? { ...seg, publicTask: data.text } : seg
        )
      );
    });

    newSocket.on('task:public:proposed', (data) => {
      // Show notification to host about proposal
      if (me?.role === 'host') {
        setToastMessage('New public task proposal received');
        setTimeout(() => setToastMessage(null), 3000);
      }
    });

    newSocket.on('toast', (data) => {
      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 3000);
    });

    newSocket.on('tasks:updated', (data: { tasks: any[] }) => {
      // Organize tasks by segmentId
      const tasksBySegment: Record<string, any[]> = {};
      data.tasks.forEach((task: any) => {
        if (!tasksBySegment[task.segmentId]) {
          tasksBySegment[task.segmentId] = [];
        }
        tasksBySegment[task.segmentId].push(task);
      });
      setSegmentTasks(tasksBySegment);
    });

    newSocket.on('participants:updated', (data) => {
      setParticipants(data.list);
    });

    newSocket.on('room:host-transferred', (data) => {
      setRoom(data.room);
      setToastMessage(`🎉 ${data.newHostName} is now the host!`);
      setTimeout(() => setToastMessage(null), 4000);

      // If I'm the new host, update my role immediately without reload
      if (me && data.newHostId === me.id) {
        setToastMessage('🎉 You are now the host! You have full control.');
        setMe(prev => prev ? { ...prev, role: 'host' } : null);
      }
    });

    newSocket.on('chat:message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [code]); // ✅ Removed router from dependencies to prevent unnecessary reconnections

  // Apply theme to body
  useEffect(() => {
    if (room) {
      document.body.setAttribute('data-theme', room.theme);
    }
  }, [room?.theme]);

  // Calculate unread messages (mock logic or real if available)
  const unreadMessages = 0; // You might want to implement real unread count later

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 animate-pulse-slow">
            <Logo size="large" />
          </div>
          <div className="text-xl">Loading room...</div>
        </div>
      </div>
    );
  }

  // Show join form if no token
  if (showJoinForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <Logo size="large" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Join Room</h1>
            <p className="text-sm opacity-60">Room code: <span className="font-mono font-semibold">{code}</span></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDirectJoin()}
                placeholder="Enter your name..."
                className="input w-full"
                maxLength={50}
                disabled={joining}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-warning/10 border border-warning text-warning px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleDirectJoin}
              disabled={joining || !joinName.trim()}
              className="btn-primary w-full"
            >
              {joining ? 'Joining...' : 'Join Room'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="btn-ghost w-full"
              disabled={joining}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !socket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <Logo size="large" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!room || !me) return null;

  return (
    <div className="h-dvh min-h-0 flex flex-col overscroll-none bg-bg text-text transition-colors duration-500">
      <RoomHeader
        room={room}
        onShareClick={() => {
          const url = `${window.location.origin}/room/${room.code}`;
          navigator.clipboard.writeText(url).then(() => {
            const btn = document.querySelector('[title="Share room link"]');
            if (btn) {
              const original = btn.textContent;
              btn.textContent = '✓ Copied!';
              setTimeout(() => {
                btn.textContent = original;
              }, 2000);
            }
          });
        }}
      />

      {error && (
        <div className="bg-warning/10 border-b border-warning px-4 py-2 text-sm text-center">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Main Content - Centered Timer */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 space-y-6 overflow-hidden z-0">
          <TimerCard
            currentSegment={segments[timerState?.currentIndex ?? 0]}
            segments={segments}
            timerState={timerState}
            isHost={me.role === 'host'}
            socket={socket}
          />

          <MemberList participants={participants} hostSessionId={room.hostSessionId} />
        </div>

        {/* Queue Panel - Floating Overlay (Now on Right) */}
        <QueuePanel
          open={queueOpen}
          segments={segments}
          currentIndex={timerState?.currentIndex ?? 0}
          segmentTasks={segmentTasks}
          role={me.role}
          socket={socket}
          participantId={me.id}
          roomId={room.id}
          timerState={timerState}
          onClose={() => setQueueOpen(false)}
        />

        {/* Chat Drawer - Floating Overlay (Now on Left) */}
        <ChatDrawer
          open={chatOpen}
          messages={messages}
          participants={participants}
          socket={socket}
          onClose={() => setChatOpen(false)}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-6 py-3 rounded-full shadow-lg animate-fade-in-down font-medium">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Control Dock */}
      <ControlDock
        onToggleQueue={() => setQueueOpen(!queueOpen)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleWhiteboard={() => setWhiteboardOpen(!whiteboardOpen)}
        onOpenSettings={() => {
          setSettingsTab('timer');
          setShowSettings(true);
        }}
        queueOpen={queueOpen}
        chatOpen={chatOpen}
        whiteboardOpen={whiteboardOpen}
        unreadMessages={unreadMessages}
      />

      {/* Whiteboard */}
      <AnimatePresence>
        {whiteboardOpen && (
          <Whiteboard
            roomId={room?.id || ''}
            socket={socket}
            userId={me?.id || ''}
            participants={participants}
            onClose={() => setWhiteboardOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Unified Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <RoomSettingsModal
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications Component */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

