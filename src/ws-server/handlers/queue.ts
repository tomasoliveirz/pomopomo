import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { setRoomTimerState, getRoomTimerState } from '../../lib/redis';
import { replaceQueueSchema, reorderQueueSchema, playQueueSchema } from '../../lib/validators';
import type { ClientEvents, ServerEvents } from '../../types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

// Global timer checker - runs independently of socket connections
let timerCheckInterval: NodeJS.Timeout | null = null;
let globalIo: Server<ClientEvents, ServerEvents> | null = null;

function startGlobalTimerChecker(io: Server<ClientEvents, ServerEvents>) {
  if (timerCheckInterval) return; // Already running
  
  globalIo = io;
  
  timerCheckInterval = setInterval(async () => {
    try {
      // Find all running rooms
      const runningRooms = await prisma.room.findMany({
        where: { status: 'running' }
      });
      
      const now = Date.now();
      
      for (const room of runningRooms) {
        const timerState = await getRoomTimerState(room.id);
        
        // Check if segment has ended
        if (timerState?.segmentEndsAt && timerState.segmentEndsAt <= now) {
          console.log(`⏰ Segment ended for room ${room.code}, auto-advancing...`);
          
          // Get segments
          const segments = await prisma.segment.findMany({
            where: { roomId: room.id },
            orderBy: { order: 'asc' }
          });
          
          const nextIndex = timerState.currentIndex + 1;
          
          if (nextIndex < segments.length) {
            // Advance to next segment
            const nextSegment = segments[nextIndex];
            const segmentEndsAt = now + nextSegment.durationSec * 1000;
            
            await prisma.room.update({
              where: { id: room.id },
              data: { currentSegmentIndex: nextIndex }
            });
            
            await setRoomTimerState(room.id, {
              status: 'running',
              currentIndex: nextIndex,
              segmentEndsAt,
              remainingSec: nextSegment.durationSec,
              lastUpdateTime: now
            });
            
            // Broadcast to all clients in room
            io.to(room.id).emit('room:state', {
              status: 'running',
              currentIndex: nextIndex,
              serverNow: now,
              segmentEndsAt
            });
            
            console.log(`✅ Advanced room ${room.code} to segment ${nextIndex}`);
          } else {
            // Queue completed
            await prisma.room.update({
              where: { id: room.id },
              data: { status: 'ended' }
            });
            
            await setRoomTimerState(room.id, {
              status: 'ended',
              currentIndex: timerState.currentIndex,
              segmentEndsAt: null,
              remainingSec: 0,
              lastUpdateTime: now
            });
            
            io.to(room.id).emit('room:state', {
              status: 'ended',
              currentIndex: timerState.currentIndex,
              serverNow: now,
              segmentEndsAt: null
            });
            
            console.log(`🏁 Queue completed for room ${room.code}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in timer checker:', error);
    }
  }, 1000); // Check every second
  
  console.log('⏱️  Global timer checker started');
}

export { startGlobalTimerChecker };

export function handleQueueEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  const { roomId, payload } = data;
  
  // Start global timer on first queue event handler registration
  startGlobalTimerChecker(io);

  // Only host can modify queue
  const requireHost = (callback: Function) => {
    if (payload.role !== 'host') {
      socket.emit('error', { message: 'Only host can perform this action', code: 'FORBIDDEN' });
      return false;
    }
    return true;
  };

  socket.on('queue:replace', async (queueData) => {
    if (!requireHost(() => {})) return;

    try {
      const validated = replaceQueueSchema.parse(queueData);
      
      // Delete existing segments
      await prisma.segment.deleteMany({ where: { roomId } });
      
      // Create new segments
      const segments = await Promise.all(
        validated.segments.map((seg, index) =>
          prisma.segment.create({
            data: {
              roomId,
              kind: seg.kind,
              label: seg.label,
              durationSec: seg.durationSec,
              order: index,
            },
          })
        )
      );

      // Reset room state
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'idle', currentSegmentIndex: 0, startsAt: null },
      });

      // Broadcast updated queue
      io.to(roomId).emit('queue:updated', { segments: segments as any });
      io.to(roomId).emit('room:state', {
        status: 'idle',
        currentIndex: 0,
        serverNow: Date.now(),
        segmentEndsAt: null,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Invalid queue data' });
    }
  });

  socket.on('queue:reorder', async (reorderData) => {
    if (!requireHost(() => {})) return;

    try {
      const validated = reorderQueueSchema.parse(reorderData);
      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      // Reorder logic
      const [movedSegment] = segments.splice(validated.from, 1);
      segments.splice(validated.to, 0, movedSegment);

      // Update order in DB
      await Promise.all(
        segments.map((seg, index) =>
          prisma.segment.update({
            where: { id: seg.id },
            data: { order: index },
          })
        )
      );

      const updatedSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      io.to(roomId).emit('queue:updated', { segments: updatedSegments as any });
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to reorder queue' });
    }
  });

  socket.on('queue:play', async (playData) => {
    if (!requireHost(() => {})) return;

    try {
      const validated = playData?.index !== undefined ? playQueueSchema.parse(playData) : { index: undefined };
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return;

      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      if (segments.length === 0) {
        socket.emit('error', { message: 'No segments in queue' });
        return;
      }

      const targetIndex = validated.index ?? room.currentSegmentIndex;
      const segment = segments[targetIndex];
      
      if (!segment) {
        socket.emit('error', { message: 'Invalid segment index' });
        return;
      }

      const now = Date.now();
      const segmentEndsAt = now + segment.durationSec * 1000;

      // Update room state
      await prisma.room.update({
        where: { id: roomId },
        data: {
          status: 'running',
          currentSegmentIndex: targetIndex,
          startsAt: room.startsAt || new Date(),
        },
      });

      // Store timer state in Redis
      await setRoomTimerState(roomId, {
        status: 'running',
        currentIndex: targetIndex,
        segmentEndsAt,
        remainingSec: segment.durationSec,
        lastUpdateTime: now,
      });

      // Broadcast state
      io.to(roomId).emit('room:state', {
        status: 'running',
        currentIndex: targetIndex,
        serverNow: now,
        segmentEndsAt,
      });

      // Note: Auto-advance is now handled by the global timer checker
      // No need for setTimeout - it's more reliable and doesn't depend on socket connections

    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to play queue' });
    }
  });

  socket.on('queue:pause', async () => {
    if (!requireHost(() => {})) return;

    try {
      const timerState = await getRoomTimerState(roomId);
      if (!timerState || timerState.status !== 'running') {
        socket.emit('error', { message: 'Queue is not running' });
        return;
      }

      const now = Date.now();
      const remainingSec = timerState.segmentEndsAt 
        ? Math.max(0, Math.floor((timerState.segmentEndsAt - now) / 1000))
        : 0;

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'paused' },
      });

      await setRoomTimerState(roomId, {
        ...timerState,
        status: 'paused',
        remainingSec,
        lastUpdateTime: now,
      });

      io.to(roomId).emit('room:state', {
        status: 'paused',
        currentIndex: timerState.currentIndex,
        serverNow: now,
        segmentEndsAt: null,
        remainingSec,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to pause queue' });
    }
  });

  socket.on('queue:skip', async () => {
    if (!requireHost(() => {})) return;

    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return;

      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      const nextIndex = room.currentSegmentIndex + 1;
      
      if (nextIndex >= segments.length) {
        // End of queue
        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'ended' },
        });
        
        // Clear timer state
        await setRoomTimerState(roomId, {
          status: 'ended',
          currentIndex: room.currentSegmentIndex,
          segmentEndsAt: null,
          remainingSec: 0,
          lastUpdateTime: Date.now(),
        });
        
        io.to(roomId).emit('room:state', {
          status: 'ended',
          currentIndex: room.currentSegmentIndex,
          serverNow: Date.now(),
          segmentEndsAt: null,
        });
      } else {
        // Play next segment immediately
        const segment = segments[nextIndex];
        if (!segment) return;

        const now = Date.now();
        const segmentEndsAt = now + segment.durationSec * 1000;

        // Update room state
        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'running',
            currentSegmentIndex: nextIndex,
          },
        });

        // Store timer state in Redis
        await setRoomTimerState(roomId, {
          status: 'running',
          currentIndex: nextIndex,
          segmentEndsAt,
          remainingSec: segment.durationSec,
          lastUpdateTime: now,
        });

        // Broadcast state
        io.to(roomId).emit('room:state', {
          status: 'running',
          currentIndex: nextIndex,
          serverNow: now,
          segmentEndsAt,
        });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to skip segment' });
    }
  });
}

