import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../infrastructure/config/env';
import { SystemClock } from '../infrastructure/config/SystemClock';
import { PrismaRoomRepository } from '../infrastructure/db/prisma/PrismaRoomRepository';
import { PrismaParticipantRepository } from '../infrastructure/db/prisma/PrismaParticipantRepository';
import { PrismaSegmentRepository } from '../infrastructure/db/prisma/PrismaSegmentRepository';
import { PrismaTaskRepository } from '../infrastructure/db/prisma/PrismaTaskRepository';
import { PrismaMessageRepository } from '../infrastructure/db/prisma/PrismaMessageRepository';
import { PrismaProposalRepository } from '../infrastructure/db/prisma/PrismaProposalRepository';
import { RedisStateRepository } from '../infrastructure/cache/RedisStateRepository';
import { RedisPresenceRepository } from '../infrastructure/cache/RedisPresenceRepository';
import { RedisRateLimiter } from '../infrastructure/security/rateLimit/RedisRateLimiter';
import { RATE_LIMIT_RULES } from '../infrastructure/security/rateLimit/rules';
import { SocketIoRoomEventsBus } from '../infrastructure/ws/SocketIoRoomEventsBus';
import { JwtAuthService } from '../infrastructure/auth/JwtAuthService';
import { JoinRoomUseCase } from '../core/application/use-cases/JoinRoomUseCase';
import { TimerService } from '../core/application/use-cases/TimerService';
import { UpdateQueueUseCase } from '../core/application/use-cases/UpdateQueueUseCase';
import { ManageTasksUseCase } from '../core/application/use-cases/ManageTasksUseCase';
import { PostMessageUseCase } from '../core/application/use-cases/PostMessageUseCase';
import { UpdateRoomPrefsUseCase } from '../core/application/use-cases/UpdateRoomPrefsUseCase';
import { SubmitProposalUseCase } from '../core/application/use-cases/SubmitProposalUseCase';
import { ModerateProposalUseCase } from '../core/application/use-cases/ModerateProposalUseCase';
import { LeaveRoomUseCase } from '../core/application/use-cases/LeaveRoomUseCase';
import type { ClientEvents, ServerEvents, InterServerEvents, WsTokenPayload } from '../types';

// Handlers (to be refactored)
import { handleRoomEvents } from './handlers/room';
import { handleQueueEvents } from './handlers/queue';
import { handleTaskEvents } from './handlers/task';
import { handleProposalEvents } from './handlers/proposal';
import { handleChatEvents } from './handlers/chat';
import { handleWhiteboardEvents } from './handlers/whiteboard';

const httpServer = createServer();

const io = new Server<ClientEvents, ServerEvents, InterServerEvents>(httpServer, {
  cors: {
    origin: config.ws.cors.origin,
    credentials: config.ws.cors.credentials,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB DoS protection
});

// Mapping for performance
const participantSockets = new Map<string, Set<Socket>>();

// Handle multi-node role updates
io.on('internal:update_role', (participantId, newRole) => {
  const sockets = participantSockets.get(participantId);
  if (sockets) {
    for (const socket of sockets) {
      socket.data.roomRole = newRole;
      console.log(`🔄 Updated role for ${participantId} to ${newRole} (internal)`);
    }
  }
});

// Setup Redis (moved to startServer)

import { TimerWorker } from '../infrastructure/ws/TimerWorker';

// --- Composition Root ---
const clock = new SystemClock();

// Repositories
const roomRepo = new PrismaRoomRepository();
const participantRepo = new PrismaParticipantRepository();
const segmentRepo = new PrismaSegmentRepository();
const taskRepo = new PrismaTaskRepository();
const messageRepo = new PrismaMessageRepository();
const proposalRepo = new PrismaProposalRepository(); // Add this
const stateRepo = new RedisStateRepository();
const presenceRepo = new RedisPresenceRepository();
const rateLimiter = new RedisRateLimiter();

// Services
const eventsBus = new SocketIoRoomEventsBus(io);
const authService = new JwtAuthService();

// Use Cases
const joinRoomUseCase = new JoinRoomUseCase(roomRepo, participantRepo, authService, eventsBus, clock);
const timerService = new TimerService(roomRepo, stateRepo, eventsBus, clock);
const updateQueueUseCase = new UpdateQueueUseCase(roomRepo, segmentRepo, eventsBus);
const manageTasksUseCase = new ManageTasksUseCase(taskRepo, segmentRepo, proposalRepo, clock);
const postMessageUseCase = new PostMessageUseCase(messageRepo, eventsBus, clock);
const updateRoomPrefsUseCase = new UpdateRoomPrefsUseCase(roomRepo, eventsBus);
const submitProposalUseCase = new SubmitProposalUseCase(proposalRepo, clock);
const moderateProposalUseCase = new ModerateProposalUseCase(proposalRepo, segmentRepo, eventsBus, clock);
const leaveRoomUseCase = new LeaveRoomUseCase(roomRepo, participantRepo, presenceRepo, eventsBus, clock);

// Workers
const timerWorker = new TimerWorker(roomRepo, segmentRepo, stateRepo, eventsBus, clock);
timerWorker.start();

// Store socket metadata
interface SocketData {
  actor: {
    actorType: 'user' | 'guest';
    actorId: string;
    sessionId: string;
    userId?: string | null;
  };
  roomId: string;
  participantId: string;
  roomRole: string;
}

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) return next(new Error('Authentication required'));

  const payload = await authService.verifyToken(token);
  if (!payload) return next(new Error('Invalid token'));

  // 4. Ownership check: verify token matches DB participant
  const participant = await participantRepo.findById(payload.participantId);
  if (!participant) return next(new Error('Participant not found'));

  // 5. Enforce DB truth: roomId and role must match database
  if (participant.props.roomId !== payload.roomId) {
    return next(new Error('Room mismatch'));
  }

  if (payload.actorType === 'user') {
    if (!payload.userId) return next(new Error('Invalid token: missing userId'));
    if (participant.props.userId !== payload.userId) {
      return next(new Error('Token ownership mismatch (user)'));
    }
  } else {
    if (!payload.sessionId) return next(new Error('Invalid token: missing sessionId'));
    if (participant.props.sessionId.toString() !== payload.sessionId) {
      return next(new Error('Token ownership mismatch (guest)'));
    }
  }

  // 6. Store in socket.data (avoid clobbering)
  socket.data.actor = {
    actorType: payload.actorType,
    actorId: payload.userId || payload.sessionId,
    sessionId: payload.sessionId,
    userId: payload.userId,
  };
  socket.data.roomId = participant.props.roomId;
  socket.data.participantId = participant.id;
  socket.data.roomRole = participant.role; // Always trust DB role
  socket.data.roomRole = participant.role; // Always trust DB role
  next();
});

// Connection Rate Limiter Middleware
io.use(async (socket, next) => {
  // Better IP extraction for proxies
  let ip = socket.handshake.address || 'unknown';
  if (config.trustProxy) {
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
      ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]).trim();
    }
  }

  try {
    // Limit per IP
    await rateLimiter.rateLimitOrThrow(`ws:connect:ip:${ip}`, RATE_LIMIT_RULES.ws.connect);
    next();
  } catch (e: any) {
    console.warn(`[RateLimit] Connection rejected for ${ip}`);
    next(new Error('Too many connection attempts'));
  }
});

import { DisconnectManager } from './DisconnectManager';

// ... (previous code)

const disconnectManager = new DisconnectManager();

io.on('connection', async (socket: Socket) => {
  const { participantId, roomId } = socket.data;
  const data = socket.data;

  // Track socket for role sync
  if (!participantSockets.has(participantId)) {
    participantSockets.set(participantId, new Set());
  }
  participantSockets.get(participantId)!.add(socket);

  socket.on('disconnect', () => {
    const sockets = participantSockets.get(participantId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        participantSockets.delete(participantId);
      }
    }
  });

  console.log(`🔌 Socket connected: ${socket.id} (Participant: ${participantId}, Room: ${roomId})`);

  // Register connection with manager
  disconnectManager.onConnect(participantId);

  try {
    // Join socket room
    socket.join(roomId);
    await presenceRepo.addPresence(roomId, participantId);

    // --- FETCH INITIAL STATE ---
    const [room, participants, messages, timerState] = await Promise.all([
      roomRepo.findById(roomId),
      participantRepo.findByRoomId(roomId),
      messageRepo.findByRoomId(roomId),
      stateRepo.getRoomTimerState(roomId),
    ]);

    if (!room) {
      throw new Error('Room not found');
    }

    const me = participants.find((p: any) => p.id === participantId);
    if (!me) {
      throw new Error('Participant not found');
    }

    // Map entities to DTOs (Sanitized)
    const hostParticipant = participants.find(p => p.props.sessionId.equals(room.props.hostSessionId));

    const roomDTO = {
      id: room.id,
      code: room.props.code.toString(),
      hostParticipantId: hostParticipant?.id || '',
      theme: room.props.theme,
      status: room.props.status,
      currentSegmentIndex: room.props.currentSegmentIndex,
      startsAt: room.props.startsAt?.toISOString() || null,
      createdAt: room.props.createdAt.toISOString(),
      expiresAt: room.props.expiresAt.toISOString(),
      segments: room.props.segments?.map((s: any) => ({
        ...s.props
      })) || []
    };

    const meDTO = {
      id: me.id,
      displayName: me.displayName,
      role: me.role,
      isMuted: me.isMuted,
      joinedAt: me.props.joinedAt.toISOString(),
      lastSeenAt: me.props.lastSeenAt.toISOString(),
      // sessionId is NOT included here unless explicitly needed
    };

    const participantsDTO = participants.map((p: any) => ({
      id: p.id,
      displayName: p.displayName,
      role: p.role,
      isMuted: p.isMuted,
      joinedAt: p.props.joinedAt.toISOString(),
      lastSeenAt: p.props.lastSeenAt.toISOString()
    }));

    const messagesDTO = messages.map((m: any) => ({
      ...m.props
    }));

    // Emit initial state
    socket.emit('room:joined', {
      room: roomDTO,
      me: meDTO,
      participants: participantsDTO,
      queue: roomDTO.segments,
      messages: messagesDTO,
    });

    // Broadcast to others so they see the new user immediately
    eventsBus.publishParticipantsUpdated(roomId, participants);

    if (timerState) {
      socket.emit('room:state', timerState);
    }

    // --- REGISTER HANDLERS ---
    handleRoomEvents(io, socket, data, { updateRoomPrefsUseCase, rateLimiter });
    handleQueueEvents(io, socket, data, { updateQueueUseCase, timerService, rateLimiter });
    handleTaskEvents(io, socket, data, { manageTasksUseCase, rateLimiter });
    handleProposalEvents(io, socket, data, { submitProposalUseCase, moderateProposalUseCase, rateLimiter });
    handleChatEvents(io, socket, data, { postMessageUseCase, rateLimiter });
    handleWhiteboardEvents(io, socket, data, { rateLimiter });

    // --- SYNC HANDLER ---
    socket.on('room:request-sync', async () => {
      const currentState = await stateRepo.getRoomTimerState(roomId);
      if (currentState) {
        socket.emit('room:state', currentState);
      }
    });

  } catch (e) {
    console.error('Connection error:', e);
    socket.emit('error', { message: 'Failed to join room' });
    socket.disconnect();
  }

  socket.on('disconnect', async () => {
    disconnectManager.onDisconnect(participantId, async () => {
      try {
        console.log(`👋 executing leave logic for ${participantId}`);
        await leaveRoomUseCase.execute({ roomId, participantId });
      } catch (e) {
        console.error('Error in disconnect handler:', e);
      }
    });
  });
});

async function startServer() {
  // Setup Redis
  const pubClient = createClient({ url: config.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Socket.IO Redis adapter initialized');

  const PORT = config.WS_PORT;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WebSocket server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

