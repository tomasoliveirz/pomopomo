'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { AnimatePresence } from 'framer-motion';
import RoomHeaderClient from '@/components/room/RoomHeaderClient';
import Logo from '@/components/Logo';
import TimerCard from '@/components/room/TimerCard';
import QueuePanel from '@/components/room/QueuePanel';
import ChatDrawer from '@/components/room/ChatDrawer';
import MemberList from '@/components/room/MemberList';
import ControlDock from '@/components/room/ControlDock';
import RoomSettingsModal from '@/components/room/RoomSettingsModal';
import ReportModal from '@/components/room/ReportModal';
import Whiteboard from '@/components/room/Whiteboard';
import { handleSegmentEnd } from '@/alerts/engine';
import RoomNotFound from '@/components/RoomNotFound';
import ProfileSetupModal from '@/components/room/ProfileSetupModal';
import UserProfileSheet from '@/components/room/UserProfileSheet';
import Toast from '@/components/Toast';
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

interface RoomClientProps {
    code: string;
    userMenu: React.ReactNode;
    isAuthenticated: boolean;
}

export default function RoomClientWrapper({ code, userMenu, isAuthenticated }: RoomClientProps) {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <RoomClient code={code} userMenu={userMenu} isAuthenticated={isAuthenticated} />
        </ErrorBoundary>
    );
}

function RoomClient({ code, userMenu, isAuthenticated }: RoomClientProps) {
    const router = useRouter();

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
    const [joining, setJoining] = useState(false); // Used in handleDirectJoin
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [modalRoomId, setModalRoomId] = useState<string | undefined>(undefined);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

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
            let wsToken: string | null = null;
            // BOOTSTRAP: Ask server for state/token
            try {
                const res = await fetch(`/api/rooms/${code}/bootstrap`, { method: 'POST' });
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 404) {
                        // Let ErrorFallback or RoomNotFound handle it
                        throw new Error('Room not found');
                    }
                    throw new Error(data.message || 'Failed to bootstrap');
                }

                if (data.status === 'joined') {
                    wsToken = data.data.wsToken;
                    // Update local storage just in case other components need it (legacy)
                    localStorage.setItem('wsToken', wsToken!);
                    if (data.data.participant) {
                        localStorage.setItem('participantId', data.data.participant.id);
                    }
                    if (data.needsProfileSetup) {
                        console.log('⚠️ Profile incomplete -> showing modal');
                        setModalRoomId(data.data.room.id);
                        setShowProfileSetup(true);
                    }
                    // Optimistically set room/me data if provided to avoid flicker
                    setRoom(data.data.room);
                    setMe(data.data.participant);
                } else if (data.status === 'needs-onboarding') {
                    console.log('Redirecting to onboarding...');
                    router.push(`/onboarding?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
                    return;
                } else if (data.status === 'needs-join') {
                    // Patch B: Check client-side session to recover from stale server state
                    try {
                        const sessRes = await fetch("/api/auth/session", { cache: "no-store" });
                        const sessData = await sessRes.json();

                        if (sessData?.user?.id) {
                            console.log("🔄 Auto-recovering: Found session for user, performing auto-join...");

                            // 1. Claim/Merge (Optimistic)
                            await fetch("/api/identity/claim", { method: "POST" }).catch(() => null);

                            // 2. Auto-join
                            const autoName = sessData.user.name ||
                                (sessData.user.email ? sessData.user.email.split("@")[0] : "User");

                            const joinRes = await fetch(`/api/rooms/${code}/join`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ displayName: autoName }),
                            });

                            if (joinRes.ok) {
                                window.location.reload();
                                return;
                            }
                        }
                    } catch (e) {
                        console.warn("Auto-join check failed", e);
                    }

                    console.log('Needs guest name -> showing form');
                    setShowJoinForm(true);
                    setLoading(false);
                    return;
                }

            } catch (err: any) {
                console.error('Bootstrap failed', err);
                setError(err.message);
                setLoading(false);
                return;
            }


            // Intelligent WS URL detection
            let wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

            // Force local WS if running locally (overrides potential prod env vars)
            if (typeof window !== 'undefined') {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocal) {
                    wsUrl = 'http://localhost:3001';
                    console.log('🔧 Local environment detected, forcing WS URL:', wsUrl);
                }
            }

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
                // ... notification logic
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
                // Deduplicate explicitly by ID to avoid UI key warnings
                const unique = Array.from(new Map(data.list.map((p: Participant) => [p.id, p])).values());
                setParticipants(unique as Participant[]);
            });

            newSocket.on('room:host-transferred', (data) => {
                setRoom(data.room);
                setToastMessage(`🎉 ${data.newHostName} is now the host!`);
                setTimeout(() => setToastMessage(null), 4000);

                const myId = localStorage.getItem('participantId');
                if (myId && data.newHostId === myId) {
                    setToastMessage('🎉 You are now the host! You have full control.');
                    setMe((prev) => prev ? { ...prev, role: 'host' } : null);
                }
            });

            newSocket.on('chat:message', (message) => {
                setMessages((prev) => [...prev, message]);
            });

            newSocket.on('message:reaction', (data) => {
                setMessages((prev) => prev.map((m) => {
                    if (m.id !== data.messageId) return m;

                    // Update counts
                    const summary = Object.entries(data.counts as Record<string, number>).map(([emoji, count]) => ({ emoji, count: Number(count) }));

                    // Update myReactions if necessary (we assume we know our own ID in the closure or ref)
                    // We can use the 'me' state, but it might be stale in this closure if not careful?
                    // socket.on listeners close over the scope where they are defined. 
                    // 'me' is state. 
                    // Better to rely on data.participantId and compare with localStorage or a Ref.
                    const myId = localStorage.getItem('participantId');

                    let myReactions = m.myReactions || [];
                    // Since 'reactions' (legacy) might be populated from findByRoomId, we might need to sync that too if we use it.
                    // But we are moving to reactionSummary.

                    if (data.participantId === myId) {
                        if (data.action === 'added') {
                            if (!myReactions.includes(data.emoji)) myReactions = [...myReactions, data.emoji];
                        } else {
                            myReactions = myReactions.filter(e => e !== data.emoji);
                        }
                    }

                    return {
                        ...m,
                        reactionSummary: summary,
                        myReactions
                    };
                }));
            });

            newSocket.on('error', (data) => {
                setError(data.message);
                setTimeout(() => setError(null), 5000);
            });

            socketRef.current = newSocket;
            setSocket(newSocket);
        };



        if (!socketRef.current) {
            initializeSocket();
        }

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
                {/* ... (Join form content same as before) ... */}
                {/* Repeating minimal form for brevity, assuming we copied it correctly. 
            Wait, I should copy it fully to avoid mistakes. */}
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
                                disabled={joining} // fixed from variable
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
            <RoomHeaderClient
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
            >
                {userMenu}
            </RoomHeaderClient>

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
                    onSelectParticipant={(p) => setSelectedParticipant(p)}
                />


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

            {/* Mandatory Profile Setup */}
            <AnimatePresence>
                {showProfileSetup && (
                    <ProfileSetupModal
                        roomId={room?.id}
                        onComplete={() => {
                            setShowProfileSetup(false);
                            window.location.reload();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* User Profile Sheet */}
            <AnimatePresence>
                {selectedParticipant && (
                    <UserProfileSheet
                        participant={selectedParticipant}
                        onClose={() => setSelectedParticipant(null)}
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
