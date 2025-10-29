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

let queueVersions: Record<string, number> = {};

function getQueueVersion(roomId: string): number {
  return queueVersions[roomId] || 0;
}

function incrementQueueVersion(roomId: string): number {
  queueVersions[roomId] = (queueVersions[roomId] || 0) + 1;
  return queueVersions[roomId];
}

export function handleQueueEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData
) {
  const { roomId, payload } = data;

  // Only host can modify queue
  const requireHost = (callback: Function) => {
    if (payload.role !== 'host') {
      socket.emit('error', { message: 'Only host can perform this action', code: 'FORBIDDEN' });
      return false;
    }
    return true;
  };

  // Recursive function to handle auto-advance continuously
  const scheduleAutoAdvance = async (targetIndex: number, durationMs: number) => {
    setTimeout(async () => {
      const currentState = await getRoomTimerState(roomId);
      if (currentState?.status !== 'running' || currentState.currentIndex !== targetIndex) {
        return; // Timer was paused or changed
      }

      // Get current segments
      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      const completedSegment = segments[targetIndex];
      if (completedSegment) {
        // DELETE the completed segment
        await prisma.segment.delete({
          where: { id: completedSegment.id },
        });
        
        // Decrement order of all remaining segments
        await prisma.segment.updateMany({
          where: { 
            roomId,
            order: { gt: completedSegment.order }
          },
          data: {
            order: { decrement: 1 }
          }
        });
      }
      
      // Re-fetch remaining segments
      const remainingSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });
      
      if (remainingSegments.length === 0) {
        // Queue completed
        await prisma.room.update({
          where: { id: roomId },
          data: { 
            status: 'ended',
            currentSegmentIndex: 0,
          },
        });
        
        await setRoomTimerState(roomId, {
          status: 'ended',
          currentIndex: 0,
          segmentEndsAt: null,
          remainingSec: 0,
          lastUpdateTime: Date.now(),
        });

        io.to(roomId).emit('room:state', {
          status: 'ended',
          currentIndex: 0,
          serverNow: Date.now(),
          segmentEndsAt: null,
        });
        
        io.to(roomId).emit('queue:snapshot', { segments: [], version: getQueueVersion(roomId) });
      } else {
        // Auto-play next segment (CONTINUOUSLY)
        const nextSegment = remainingSegments[0];
        const nextNow = Date.now();
        const nextSegmentEndsAt = nextNow + nextSegment.durationSec * 1000;

        await prisma.room.update({
          where: { id: roomId },
          data: {
            status: 'running',
            currentSegmentIndex: 0,
          },
        });

        await setRoomTimerState(roomId, {
          status: 'running',
          currentIndex: 0,
          segmentEndsAt: nextSegmentEndsAt,
          remainingSec: nextSegment.durationSec,
          lastUpdateTime: nextNow,
        });

        io.to(roomId).emit('room:state', {
          status: 'running',
          currentIndex: 0,
          serverNow: nextNow,
          segmentEndsAt: nextSegmentEndsAt,
        });
        
        io.to(roomId).emit('queue:snapshot', { segments: remainingSegments as any, version: getQueueVersion(roomId) });
        
        // 🔥 RECURSIVELY schedule next auto-advance
        scheduleAutoAdvance(0, nextSegment.durationSec * 1000);
      }
    }, durationMs);
  };

  socket.on('queue:get', async (callback) => {
    try {
      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });
      
      const version = getQueueVersion(roomId);
      
      if (callback) {
        callback({ segments, version });
      } else {
        socket.emit('queue:snapshot', { segments: segments as any, version });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to get queue' });
    }
  });

  socket.on('queue:replace', async (queueData, ack) => {
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
              publicTask: seg.publicTask || null,
            },
          })
        )
      );

      // Increment version
      const version = incrementQueueVersion(roomId);

      // Reset room state
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'idle', currentSegmentIndex: 0, startsAt: null },
      });

      // Broadcast updated queue with version
      io.to(roomId).emit('queue:snapshot', { segments: segments as any, version });
      io.to(roomId).emit('room:state', {
        status: 'idle',
        currentIndex: 0,
        serverNow: Date.now(),
        segmentEndsAt: null,
      });

      if (ack) ack(true);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Invalid queue data' });
      if (ack) ack(false);
    }
  });

  socket.on('queue:add', async (addData, ack) => {
    if (!requireHost(() => {})) return;

    try {
      const existingSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      const newSegment = await prisma.segment.create({
        data: {
          roomId,
          kind: addData.segment.kind,
          label: addData.segment.label,
          durationSec: addData.segment.durationSec,
          order: existingSegments.length,
          publicTask: addData.segment.publicTask || null,
        },
      });

      const version = incrementQueueVersion(roomId);

      const allSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      io.to(roomId).emit('queue:snapshot', { segments: allSegments as any, version });

      if (ack) ack(true);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to add segment' });
      if (ack) ack(false);
    }
  });

  socket.on('queue:remove', async (removeData, ack) => {
    if (!requireHost(() => {})) return;

    try {
      await prisma.segment.delete({
        where: { id: removeData.segmentId },
      });

      // Reorder remaining segments
      const segments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      await Promise.all(
        segments.map((seg, index) =>
          prisma.segment.update({
            where: { id: seg.id },
            data: { order: index },
          })
        )
      );

      const version = incrementQueueVersion(roomId);

      const updatedSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      io.to(roomId).emit('queue:snapshot', { segments: updatedSegments as any, version });

      if (ack) ack(true);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to remove segment' });
      if (ack) ack(false);
    }
  });

  socket.on('queue:reorder', async (reorderData, ack) => {
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

      const version = incrementQueueVersion(roomId);

      const updatedSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      io.to(roomId).emit('queue:snapshot', { segments: updatedSegments as any, version });

      if (ack) ack(true);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to reorder queue' });
      if (ack) ack(false);
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

      // 🔥 Schedule RECURSIVE auto-advance for continuous flow
      scheduleAutoAdvance(targetIndex, segment.durationSec * 1000);

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
      const remainingSec = Math.max(0, Math.floor((timerState.segmentEndsAt! - now) / 1000));

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

      const currentSegment = segments[room.currentSegmentIndex];
      if (currentSegment) {
        // Emit segment consumed
        io.to(roomId).emit('segment:consumed', { segmentId: currentSegment.id });
        
        // DELETE segment from DB (make it disappear completely)
        await prisma.segment.delete({
          where: { id: currentSegment.id },
        });
        
        // Decrement order of all remaining segments
        await prisma.segment.updateMany({
          where: { 
            roomId,
            order: { gt: currentSegment.order }
          },
          data: {
            order: { decrement: 1 }
          }
        });
      }

      // Re-fetch segments after deletion
      const remainingSegments = await prisma.segment.findMany({
        where: { roomId },
        orderBy: { order: 'asc' },
      });

      // After deleting current segment, next segment is now at index 0
      const nextIndex = 0;
      
      if (remainingSegments.length === 0) {
        // No more segments - end the queue
        await prisma.room.update({
          where: { id: roomId },
          data: { 
            status: 'ended',
            currentSegmentIndex: 0,
          },
        });
        
        // Clear timer state
        await setRoomTimerState(roomId, {
          status: 'ended',
          currentIndex: 0,
          segmentEndsAt: null,
          remainingSec: 0,
          lastUpdateTime: Date.now(),
        });
        
        io.to(roomId).emit('room:state', {
          status: 'ended',
          currentIndex: 0,
          serverNow: Date.now(),
          segmentEndsAt: null,
        });
        
        // Broadcast updated segments list (empty)
        io.to(roomId).emit('queue:snapshot', { segments: [], version: getQueueVersion(roomId) });
      } else {
        // Play next segment immediately (now at index 0)
        const segment = remainingSegments[nextIndex];
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
        
        // Broadcast updated segments list
        io.to(roomId).emit('queue:snapshot', { segments: remainingSegments as any, version: getQueueVersion(roomId) });
        
        // 🔥 Schedule RECURSIVE auto-advance for CONTINUOUS flow after skip
        scheduleAutoAdvance(nextIndex, segment.durationSec * 1000);
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to skip segment' });
    }
  });
}
