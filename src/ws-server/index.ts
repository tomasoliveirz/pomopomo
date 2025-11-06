import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { prisma } from '../lib/prisma';
import { redis, getRoomTimerState, setRoomTimerState, addRoomPresence, removeRoomPresence, getRoomPresence, deleteRoomData } from '../lib/redis';
import { verifyWsToken } from '../lib/auth';
import { config } from '../lib/config';
import type { ClientEvents, ServerEvents, WsTokenPayload } from '../types';
import { handleRoomEvents } from './handlers/room';
import { handleQueueEvents } from './handlers/queue';
import { handleTaskEvents } from './handlers/task';
import { handleProposalEvents } from './handlers/proposal';
import { handleChatEvents } from './handlers/chat';

const httpServer = createServer();

const io = new Server<ClientEvents, ServerEvents>(httpServer, {
  cors: config.ws.cors,
  transports: ['websocket', 'polling'],
});

// Track pending host transfers (grace period for reconnection)
const pendingHostTransfers = new Map<string, NodeJS.Timeout>();

// Track pending room deletions (30s grace period for reconnection)
const pendingRoomDeletions = new Map<string, NodeJS.Timeout>();

// Setup Redis adapter for horizontal scaling
const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Socket.IO Redis adapter initialized');
});

// Store socket metadata
interface SocketData {
  payload: WsTokenPayload;
  roomId: string;
  participantId: string;
}

// Authentication middleware
io.use(async (socket, next) => {
  console.log('🔍 New connection attempt from:', socket.handshake.address);
  console.log('🔍 Headers:', socket.handshake.headers.origin);
  
  const token = socket.handshake.auth.token as string;
  
  if (!token) {
    console.log('❌ No token provided');
    return next(new Error('Authentication required'));
  }

  console.log('🔑 Token received, verifying...');
  const payload = await verifyWsToken(token);
  if (!payload) {
    console.log('❌ Invalid token');
    return next(new Error('Invalid token'));
  }

  console.log('✅ Token valid for participant:', payload.participantId);
  // Store payload in socket data
  (socket as any).data = { payload, roomId: payload.roomId, participantId: payload.participantId } as SocketData;
  next();
});

io.on('connection', async (socket: Socket) => {
  const data = (socket as any).data as SocketData;
  const { roomId, participantId, payload } = data;

  console.log(`✅ Client connected: ${participantId} to room ${roomId}`);

  // Join room
  socket.join(roomId);
  await addRoomPresence(roomId, participantId);

  // Update last seen (handle case where participant was deleted)
  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    console.log(`⚠️ Could not update participant ${participantId} (probably deleted)`);
    socket.disconnect();
    return;
  }

  // Send current room state
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const segments = await prisma.segment.findMany({
    where: { roomId },
    orderBy: { order: 'asc' },
  });
  // ✅ Only send ACTIVE participants
  const activeIds = await getRoomPresence(roomId);
  const participants = await prisma.participant.findMany({ 
    where: { 
      roomId,
      id: { in: activeIds }
    } 
  });

  if (room) {
    // Find current participant
    const me = participants.find(p => p.id === participantId);
    
    if (me) {
      // Send room:joined event that the client expects
      socket.emit('room:joined', {
        room: {
          id: room.id,
          code: room.code,
          hostSessionId: room.hostSessionId,
          theme: room.theme,
          status: room.status,
          currentSegmentIndex: room.currentSegmentIndex,
          startsAt: room.startsAt?.toISOString() || null,
          createdAt: room.createdAt.toISOString(),
          expiresAt: room.expiresAt.toISOString(),
        },
        me: {
          id: me.id,
          displayName: me.displayName,
          role: me.role,
          isMuted: me.isMuted,
          joinedAt: me.joinedAt.toISOString(),
          lastSeenAt: me.lastSeenAt.toISOString(),
        },
        participants: participants.map(p => ({
          id: p.id,
          displayName: p.displayName,
          role: p.role,
          isMuted: p.isMuted,
          joinedAt: p.joinedAt.toISOString(),
          lastSeenAt: p.lastSeenAt.toISOString(),
        })),
        queue: segments,
      });
    }
    
    const timerState = await getRoomTimerState(roomId);
    const serverNow = Date.now();
    
    socket.emit('room:state', {
      status: room.status,
      currentIndex: room.currentSegmentIndex,
      serverNow,
      segmentEndsAt: timerState?.segmentEndsAt || null,
      remainingSec: timerState?.remainingSec,
    });
    
    // Broadcast participant list update to all
    io.to(roomId).emit('participants:updated', { list: participants.map(p => ({
      id: p.id,
      displayName: p.displayName,
      role: p.role,
      isMuted: p.isMuted,
      joinedAt: p.joinedAt.toISOString(),
      lastSeenAt: p.lastSeenAt.toISOString(),
    })) });
  }

  // Register event handlers
  handleRoomEvents(io, socket, data);
  handleQueueEvents(io, socket, data);
  handleTaskEvents(io, socket, data);
  handleProposalEvents(io, socket, data);
  handleChatEvents(io, socket, data);

  // Heartbeat system to detect active users
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let lastHeartbeat = Date.now();
  
  const startHeartbeat = () => {
    heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastBeat = now - lastHeartbeat;
      
      // If no heartbeat response in 30 seconds, consider disconnected
      if (timeSinceLastBeat > 30000) {
        console.log(`💔 Heartbeat timeout for ${participantId}, disconnecting...`);
        socket.disconnect();
        return;
      }
      
      // Send ping
      socket.emit('ping', { timestamp: now });
    }, 10000); // Check every 10 seconds
  };
  
  // Handle pong response
  socket.on('pong', () => {
    lastHeartbeat = Date.now();
  });
  
  // Start heartbeat monitoring
  startHeartbeat();

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ Client disconnected: ${participantId}`);
    
    // Stop heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    await removeRoomPresence(roomId, participantId);
    
    // Update last seen
    await prisma.participant.update({
      where: { id: participantId },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});

    // Check if disconnected user was the host
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const disconnectedParticipant = await prisma.participant.findUnique({ 
      where: { id: participantId } 
    });

    // If the host disconnected, start a grace period before transferring
    if (room && disconnectedParticipant?.role === 'host') {
      const transferKey = `${roomId}:${participantId}`;
      
      // Clear any existing pending transfer for this participant
      const existingTransfer = pendingHostTransfers.get(transferKey);
      if (existingTransfer) {
        clearTimeout(existingTransfer);
      }
      
      // Wait 10 seconds before transferring host (gives time to reconnect)
      const transferTimeout = setTimeout(async () => {
        console.log(`⏰ Grace period expired for host ${participantId}, checking if transfer needed...`);
        
        // Check if host reconnected (look for active socket connections)
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const hostReconnected = socketsInRoom.some(s => {
          const sData = s.data as WsTokenPayload;
          return sData.participantId === participantId;
        });
        
        if (hostReconnected) {
          console.log(`✅ Host ${participantId} reconnected, no transfer needed`);
          pendingHostTransfers.delete(transferKey);
          return;
        }
        
        // Host didn't reconnect, transfer to someone else
        const participants = await prisma.participant.findMany({ 
          where: { roomId },
          orderBy: { joinedAt: 'asc' }
        });
        
        const activeParticipants = participants.filter(p => p.id !== participantId);
        
        if (activeParticipants.length > 0) {
          // Randomly choose a new host
          const randomIndex = Math.floor(Math.random() * activeParticipants.length);
          const newHost = activeParticipants[randomIndex];
          
          console.log(`🔄 Transferring host from ${participantId} to ${newHost.id} (${newHost.displayName})`);
          
          // First, demote the old host to guest
          await prisma.participant.update({
            where: { id: participantId },
            data: { role: 'guest' },
          }).catch(err => console.log(`⚠️ Could not demote old host (probably deleted): ${err.message}`));
          
          // Update the new host's role
          await prisma.participant.update({
            where: { id: newHost.id },
            data: { role: 'host' },
          });
          
          // Update room's hostSessionId
          await prisma.room.update({
            where: { id: roomId },
            data: { hostSessionId: newHost.sessionId },
          });
          
          // Get updated room and participants
          const updatedRoom = await prisma.room.findUnique({ where: { id: roomId } });
          // ✅ Only get ACTIVE participants
          const activeParticipantIds = await getRoomPresence(roomId);
          const updatedParticipants = await prisma.participant.findMany({ 
            where: { 
              roomId,
              id: { in: activeParticipantIds }
            },
            orderBy: { joinedAt: 'asc' }
          });
          
          // Broadcast host transfer to all
          if (updatedRoom) {
            io.to(roomId).emit('room:host-transferred', {
              newHostId: newHost.id,
              newHostName: newHost.displayName,
              room: updatedRoom as any,
            });
          }
          
          // Broadcast updated participant list
          io.to(roomId).emit('participants:updated', { 
            list: updatedParticipants.map(p => ({
              id: p.id,
              displayName: p.displayName,
              role: p.role,
              isMuted: p.isMuted,
              joinedAt: p.joinedAt.toISOString(),
              lastSeenAt: p.lastSeenAt.toISOString(),
            }))
          });
        }
        
        pendingHostTransfers.delete(transferKey);
      }, 10000); // 10 second grace period
      
      pendingHostTransfers.set(transferKey, transferTimeout);
      console.log(`⏱️ Started 10s grace period for host ${participantId}`);
    }

    // Broadcast updated participant list (for all disconnects)
    // FILTER only ACTIVE participants using Redis presence
    const activeParticipantIds = await getRoomPresence(roomId);
    const participants = await prisma.participant.findMany({ 
      where: { 
        roomId,
        id: { in: activeParticipantIds }, // ✅ Only active participants!
      },
      orderBy: { joinedAt: 'asc' }
    });
    
    io.to(roomId).emit('participants:updated', { 
      list: participants.map(p => ({
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        isMuted: p.isMuted,
        joinedAt: p.joinedAt.toISOString(),
        lastSeenAt: p.lastSeenAt.toISOString(),
      }))
    });

    // 🧹 AUTO-CLEANUP: Delete room if empty (no active participants)
    if (participants.length === 0) {
      console.log(`🧹 Room ${roomId} is empty, starting 30s grace period before deletion...`);
      
      // Clear any existing pending deletion for this room
      const existingDeletion = pendingRoomDeletions.get(roomId);
      if (existingDeletion) {
        clearTimeout(existingDeletion);
      }
      
      // Wait 30 seconds before deleting (gives time for reconnection)
      const deletionTimeout = setTimeout(async () => {
        console.log(`⏰ Grace period expired for room ${roomId}, checking if deletion needed...`);
        
        // Check if anyone reconnected
        const currentActiveIds = await getRoomPresence(roomId);
        
        if (currentActiveIds.length > 0) {
          console.log(`✅ Someone reconnected to room ${roomId}, canceling deletion`);
          pendingRoomDeletions.delete(roomId);
          return;
        }
        
        // Room is still empty, delete it
        console.log(`🧹 Room ${roomId} still empty, cleaning up...`);
        
        try {
          // Delete room from database (CASCADE will delete segments, participants, tasks, messages, proposals)
          await prisma.room.delete({
            where: { id: roomId }
          });
          
          // Delete room data from Redis
          await deleteRoomData(roomId);
          
          console.log(`✅ Room ${roomId} cleaned up successfully`);
        } catch (error) {
          console.error(`❌ Error cleaning up room ${roomId}:`, error);
        }
        
        pendingRoomDeletions.delete(roomId);
      }, 30000); // 30 second grace period
      
      pendingRoomDeletions.set(roomId, deletionTimeout);
    } else {
      // If there are still participants, cancel any pending deletion
      const existingDeletion = pendingRoomDeletions.get(roomId);
      if (existingDeletion) {
        console.log(`✅ Room ${roomId} has participants again, canceling pending deletion`);
        clearTimeout(existingDeletion);
        pendingRoomDeletions.delete(roomId);
      }
    }
  });
});

// Start server
const PORT = config.ws.port;
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  if (redis) {
    await redis.quit();
  }
  await pubClient.quit();
  await subClient.quit();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

