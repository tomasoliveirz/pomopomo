import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents, Stroke } from '../../types';
import { requireHost } from '../guards';
import { z } from 'zod';
import { RedisRateLimiter } from '../../infrastructure/cache/RedisRateLimiter';

const strokeSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['pen', 'rect', 'circle', 'text']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    points: z.array(z.tuple([
        z.number().min(0).max(2000), // x
        z.number().min(0).max(2000), // y
        z.number().min(0).max(1)     // pressure
    ])).max(500),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    radius: z.number().optional(),
    content: z.string().max(100).optional(),
    strokeWidth: z.number().optional(),
    fontSize: z.number().optional(),
});

// In-memory store for whiteboards (as requested)
interface WhiteboardState {
    strokes: Stroke[];
    lastActivity: number;
}
const roomWhiteboards: Record<string, WhiteboardState> = {};

const MAX_STROKES_PER_ROOM = 1000;
const MAX_POINTS_PER_STROKE = 500;
const WHITEBOARD_TTL_MS = 1000 * 60 * 60; // 1 hour of inactivity

// Periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const roomId in roomWhiteboards) {
        if (now - roomWhiteboards[roomId].lastActivity > WHITEBOARD_TTL_MS) {
            delete roomWhiteboards[roomId];
            console.log(`🧹 Cleaned up inactive whiteboard for room ${roomId}`);
        }
    }
}, 1000 * 60 * 10); // Every 10 minutes

export function handleWhiteboardEvents(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    data: any,
    dependencies: {
        rateLimiter: RedisRateLimiter;
    }
) {
    const { roomId } = socket.data;
    const { actorId } = socket.data.actor;
    const { rateLimiter } = dependencies;

    // Send initial state on join
    if (roomWhiteboards[roomId]) {
        socket.emit('whiteboard:state', roomWhiteboards[roomId].strokes);
    }

    socket.on('whiteboard:request-state', (targetRoomId) => {
        if (targetRoomId !== roomId) return;
        if (roomWhiteboards[roomId]) {
            socket.emit('whiteboard:state', roomWhiteboards[roomId].strokes);
        }
    });

    socket.on('whiteboard:draw', async ({ roomId: targetRoomId, stroke }) => {
        if (targetRoomId !== roomId) return;

        try {
            // 1. Payload validation
            const validatedStroke = strokeSchema.parse(stroke);

            // 2. Rate limit check
            const allowed = await rateLimiter.checkLimit(
                `whiteboard_draw:${actorId}`,
                100, // 100 strokes per minute
                60 * 1000
            );

            if (!allowed) {
                socket.emit('error', { message: 'Drawing too fast' });
                return;
            }

            // 3. Spoofing protection: Overwrite userId with server-side identity
            const strokeWithUser: Stroke = {
                ...validatedStroke,
                userId: actorId
            };

            // 4. Limits: Prevent memory exhaustion
            if (!roomWhiteboards[roomId]) {
                roomWhiteboards[roomId] = { strokes: [], lastActivity: Date.now() };
            }

            const state = roomWhiteboards[roomId];
            state.lastActivity = Date.now();

            if (state.strokes.length >= MAX_STROKES_PER_ROOM) {
                socket.emit('error', { message: 'Whiteboard is full' });
                return;
            }

            state.strokes.push(strokeWithUser);
            socket.to(roomId).emit('whiteboard:new-stroke', strokeWithUser);
        } catch (e: any) {
            socket.emit('error', { message: e.message || 'Invalid stroke data' });
        }
    });

    socket.on('whiteboard:erase', async ({ roomId: targetRoomId, strokeId }) => {
        if (targetRoomId !== roomId) return;

        try {
            // Rate limit check for erasing
            const allowed = await rateLimiter.checkLimit(
                `whiteboard_erase:${actorId}`,
                50, // 50 erasures per minute
                60 * 1000
            );

            if (!allowed) {
                socket.emit('error', { message: 'Erasing too fast' });
                return;
            }

            if (roomWhiteboards[roomId]) {
                const state = roomWhiteboards[roomId];
                state.lastActivity = Date.now();
                state.strokes = state.strokes.filter((s) => s.id !== strokeId);
            }
            socket.to(roomId).emit('whiteboard:erase', strokeId);
        } catch (e: any) {
            socket.emit('error', { message: e.message || 'Failed to erase' });
        }
    });

    socket.on('whiteboard:clear', (targetRoomId) => {
        if (targetRoomId !== roomId) return;

        try {
            requireHost(socket);
            roomWhiteboards[roomId] = { strokes: [], lastActivity: Date.now() };
            io.to(roomId).emit('whiteboard:clear');
        } catch (e: any) {
            socket.emit('error', { message: e.message });
        }
    });
}
