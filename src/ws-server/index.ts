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
import { RedisRateLimiter } from '../infrastructure/cache/RedisRateLimiter';
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
import type { ClientEvents, ServerEvents, WsTokenPayload } from '../types';

// Handlers (to be refactored)
import { handleRoomEvents } from './handlers/room';
import { handleQueueEvents } from './handlers/queue';
import { handleTaskEvents } from './handlers/task';
import { handleProposalEvents } from './handlers/proposal';
import { handleChatEvents } from './handlers/chat';

const httpServer = createServer();

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: {
    origin: '*', // Should be configured via env
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
});

// Setup Redis
const pubClient = createClient({ url: config.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Socket.IO Redis adapter initialized');
});

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
  payload: WsTokenPayload;
  roomId: string;
  participantId: string;
}

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) return next(new Error('Authentication required'));

  const payload = await authService.verifyToken(token);
  if (!payload) return next(new Error('Invalid token'));

  (socket as any).data = { payload, roomId: payload.roomId, participantId: payload.participantId } as SocketData;
  next();
});

io.on('connection', async (socket: Socket) => {
  const data = (socket as any).data as SocketData;
  const { roomId, participantId, payload } = data;

  console.log(`✅ Client connected: ${participantId} to room ${roomId}`);

  try {
    // Reconnection logic:
    // We trust the token's roomId and participantId.
    // We manually reconstruct the state instead of using JoinRoomUseCase
    // because JoinRoomUseCase expects a Room Code (for new joins),
    // whereas we have the Room ID (for re-joins/reconnections).

    // Join socket room
    socket.join(roomId);
    await presenceRepo.addPresence(roomId, participantId);

    // Update last seen
    // participantRepo.save(...)

    // Fetch data for initial state
    const roomEntity = await roomRepo.findById(roomId);
    if (!roomEntity) {
      socket.disconnect();
      return;
    }

    const segments = await segmentRepo.findByRoomId(roomId);
    const activeIds = await presenceRepo.getPresence(roomId);
    const participants = await participantRepo.findByRoomId(roomId);
    const activeParticipants = participants.filter(p => activeIds.includes(p.id));

    const me = participants.find(p => p.id === participantId);

    const messages = await messageRepo.findByRoomId(roomId, 50);

    if (me) {
      socket.emit('room:joined', {
        room: {
          id: roomEntity.id,
          code: roomEntity.code.toString(),
          hostSessionId: roomEntity.props.hostSessionId.toString(),
          theme: roomEntity.props.theme,
          status: roomEntity.status,
          currentSegmentIndex: roomEntity.currentSegmentIndex,
          startsAt: roomEntity.props.startsAt?.toISOString() || null,
          createdAt: roomEntity.props.createdAt.toISOString(),
          expiresAt: roomEntity.props.expiresAt.toISOString(),
        },
        me: {
          id: me.id,
          displayName: me.displayName,
          role: me.role,
          isMuted: me.isMuted,
          joinedAt: me.props.joinedAt.toISOString(),
          lastSeenAt: me.props.lastSeenAt.toISOString(),
        },
        participants: activeParticipants.map(p => ({
          id: p.id,
          displayName: p.displayName,
          role: p.role,
          isMuted: p.isMuted,
          joinedAt: p.props.joinedAt.toISOString(),
          lastSeenAt: p.props.lastSeenAt.toISOString(),
        })),
        queue: segments.map(s => ({
          id: s.id,
          kind: s.kind,
          label: s.label,
          durationSec: s.durationSec,
          order: s.order,
          publicTask: s.publicTask || undefined
        })),
        messages: messages.map(m => ({
          id: m.id,
          participantId: m.props.participantId,
          text: m.props.text,
          reactions: m.props.reactions,
          isShadowHidden: m.props.isShadowHidden,
          createdAt: m.props.createdAt.toISOString(),
          roomId: m.props.roomId
        })),
      });
    }

    const timerState = await stateRepo.getRoomTimerState(roomId);

    socket.emit('room:state', {
      status: roomEntity.status,
      currentIndex: roomEntity.currentSegmentIndex,
      serverNow: Date.now(),
      segmentEndsAt: timerState?.segmentEndsAt || null,
      remainingSec: timerState?.remainingSec,
    });

    // Broadcast participant list
    eventsBus.publishParticipantsUpdated(roomId, activeParticipants);

    // Register handlers with injected dependencies
    handleRoomEvents(io, socket, data, {
      updateRoomPrefsUseCase
    });

    handleQueueEvents(io, socket, data, {
      timerService,
      updateQueueUseCase
    });

    handleTaskEvents(io, socket, data, {
      manageTasksUseCase
    });

    handleProposalEvents(io, socket, data, {
      submitProposalUseCase,
      moderateProposalUseCase
    });

    handleChatEvents(io, socket, data, {
      postMessageUseCase,
      rateLimiter
    });

  } catch (e) {
    console.error(e);
    socket.disconnect();
  }

  socket.on('disconnect', async () => {
    try {
      await leaveRoomUseCase.execute({ roomId, participantId });
    } catch (e) {
      console.error('Error in disconnect handler:', e);
    }
  });
});

const PORT = config.WS_PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

