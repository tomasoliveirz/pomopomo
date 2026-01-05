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
import { handleWhiteboardEvents } from './handlers/whiteboard';

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

import { DisconnectManager } from './DisconnectManager';

// ... (previous code)

const disconnectManager = new DisconnectManager();

io.on('connection', async (socket: Socket) => {
  const data = (socket as any).data as SocketData;
  const { roomId, participantId, payload } = data;

  console.log(`✅ Client connected: ${participantId} to room ${roomId}`);

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

    // Map entities to DTOs
    const roomDTO = {
      ...room.props,
      code: room.props.code.toString(),
      hostSessionId: room.props.hostSessionId.toString(),
      segments: room.props.segments?.map((s: any) => ({
        ...s.props
      })) || []
    };

    const meDTO = {
      ...me.props,
      sessionId: me.props.sessionId.toString()
    };

    const participantsDTO = participants.map((p: any) => ({
      ...p.props,
      sessionId: p.props.sessionId.toString()
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
    handleRoomEvents(io, socket, data, { updateRoomPrefsUseCase });
    handleQueueEvents(io, socket, data, { updateQueueUseCase, timerService });
    handleTaskEvents(io, socket, data, { manageTasksUseCase });
    handleProposalEvents(io, socket, data, { submitProposalUseCase, moderateProposalUseCase });
    handleChatEvents(io, socket, data, { postMessageUseCase, rateLimiter });
    handleWhiteboardEvents(io, socket, data);

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

const PORT = config.WS_PORT;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

