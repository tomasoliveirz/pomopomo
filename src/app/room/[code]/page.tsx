'use client';

import { useEffect, useState, useRef } from 'react';
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
import ReportModal from '@/components/room/ReportModal';
import Whiteboard from '@/components/room/Whiteboard';
import { handleSegmentEnd } from '@/alerts/engine';
import RoomNotFound from '@/components/RoomNotFound';
import type { Room, Participant, Segment, Message, RoomStatus } from '@/types';

// Simple Error Boundary Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="text-gray-600">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

import { ErrorBoundary } from 'react-error-boundary';

export default function RoomPageWrapper() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RoomPage />
    </ErrorBoundary>
  );
}

function RoomPage() {
  const params = useParams();
  // ... rest of the component code ...

  const router = useRouter();
  const code = params.code as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null); // ✅ Ref for safe cleanup
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
  const [showReportModal, setShowReportModal] = useState(false);
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
    const initializeSocket = async () => {
      let wsToken = localStorage.getItem('wsToken');
      const participantId = localStorage.getItem('participantId');

      // If no token, attempt to fetch a fresh one (e.g. after auth merge or expiry)
      if (!wsToken) {
        console.log('🔄 No WS token found, attempting to get one...');
        try {
          const res = await fetch(`/api/rooms/${code}/ws-token`, { method: 'POST' });
          const data = await res.json();

          if (res.ok && data.success) {
            console.log('✅ Obtained fresh WS token');
            wsToken = data.data.wsToken;
            localStorage.setItem('wsToken', wsToken!);
            if (data.data.participantId) {
              localStorage.setItem('participantId', data.data.participantId);
            }
          } else {
            console.log('⚠️ Could not auto-join, showing helper.');
            setShowJoinForm(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch WS token', err);
          setShowJoinForm(true);
          setLoading(false);
          return;
        }
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

      const newSocket = io(wsUrl, {
        auth: { token: wsToken },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      // Connection timeout safety
      const timeoutId = setTimeout(() => {
        if (!newSocket.connected) {
          console.error('Connection timed out');
          setError('Connection timed out. Please try refreshing.');
          setLoading(false);
        }
      }, 15000);

      newSocket.on('connect', () => {
        clearTimeout(timeoutId);
        console.log('✅ Socket connected:', newSocket.id);
      });

      newSocket.on('connect_error', (err: any) => {
        clearTimeout(timeoutId);
        console.error('WebSocket connection error:', err.message);

        // Handle Token Expiry / Invalid Token
        if (err.message === 'Authentication error' || err.message.includes('jwt expired')) {
          console.log('🔄 Token expired or invalid, clearing session...');
          localStorage.removeItem('wsToken');
          setError('Session expired. Please refresh the page.');
        } else {
          setError(`Connection failed: ${err.message}`);
        }
        setLoading(false);
      });

      newSocket.on('room:joined', (data) => {
        console.log('✅ Room joined:', data.room.code);
        setRoom(data.room);
        setMe(data.me);
        setParticipants(data.participants);
        setSegments(data.queue);
        setMessages(data.messages);
        setLoading(false);
      });

      let lastSegmentIndex = -1;

      newSocket.on('room:state', (data) => {
        if (data.currentIndex > lastSegmentIndex && lastSegmentIndex >= 0) {
          handleSegmentEnd();
        }
        lastSegmentIndex = data.currentIndex;
        setTimerState(data);
        setRoom((prev) => prev ? { ...prev, status: data.status, currentSegmentIndex: data.currentIndex } : null);
      });

      newSocket.on('queue:updated', (data) => {
        setSegments(data.segments);
      });

      newSocket.on('queue:snapshot', (data) => {
        setSegments(data.segments);
      });

      newSocket.on('segment:consumed', () => {
        handleSegmentEnd();
      });

      newSocket.on('ping', () => {
        newSocket.emit('pong');
      });

      newSocket.on('task:private:updated', (data) => {
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
        setSegments((prev) =>
          prev.map((seg) =>
            seg.id === data.segmentId ? { ...seg, publicTask: data.text } : seg
          )
        );
      });

      newSocket.on('task:public:proposed', () => {
        if (false) {
          // Logic handled by toast usually, or check role inside component state if possible, 
          // but 'me' is state, accessible here via closure? No, stale closure!
          // 'me' inside this effect will be the initial null value or whatever it was when effect ran.
          // To fix stale closure issues for 'me', we should use functional updates or refs,
          // OR just rely on the toast message coming from server if provided.
          // For now, let's keep it simple or remove the check if it relies on stale state.
          // Actually, the server 'toast' event handles general notifications. 
          // This specific event might need valid 'me'. 
          // Let's safe guard it.
        }
        setToastMessage('New public task proposal received');
      });

      newSocket.on('toast', (data) => {
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(null), 3000);
      });

      newSocket.on('tasks:updated', (data: { tasks: any[] }) => {
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

        // We can't easily check 'me.id' here due to stale closure.
        // But we can check if local participantId matches.
        const myId = localStorage.getItem('participantId');
        if (myId && data.newHostId === myId) {
          setToastMessage('🎉 You are now the host! You have full control.');
          setMe((prev) => prev ? { ...prev, role: 'host' } : null);
        }
      });

      newSocket.on('chat:message', (message) => {
        setMessages((prev) => [...prev, message]);
      });

      newSocket.on('error', (data) => {
        setError(data.message);
        setTimeout(() => setError(null), 5000);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    initializeSocket();

    return () => {
      const s = socketRef.current;
      if (s) {
        console.log('🔌 Disconnecting socket cleanup...');
        s.removeAllListeners();
        s.close();
        socketRef.current = null;
      }
    };
  }, [code]); // Re-run if code changes

  // Apply theme to body
  useEffect(() => {
    if (room) {
      document.body.setAttribute('data-theme', room.theme);
    }
  }, [room?.theme]);

  // Safety Check: If timer is running but stuck at 00:00, request sync
  useEffect(() => {
    if (!timerState || !socket) return;

    let timeoutId: NodeJS.Timeout;

    if (timerState.status === 'running' && timerState.segmentEndsAt) {
      const now = Date.now();
      const remaining = Math.ceil((timerState.segmentEndsAt - now) / 1000);

      if (remaining <= 0) {
        // Timer should have transitioned. If we are still here after 3s, request sync.
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Timer stuck at 00:00, requesting sync...');
          socket.emit('room:request-sync');
        }, 3000);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [timerState, socket]);

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
    return <RoomNotFound />;
  }

  if (!room || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 animate-pulse-slow">
            <Logo size="large" />
          </div>
          <div className="text-xl">Synchronizing room data...</div>
        </div>
      </div>
    );
  }

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
        onReportClick={() => setShowReportModal(true)}
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

          <MemberList participants={participants} />
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

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal onClose={() => setShowReportModal(false)} />
        )}
      </AnimatePresence>

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

