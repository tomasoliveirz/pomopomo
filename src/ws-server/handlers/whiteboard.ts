import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents, Stroke } from '../../types';

// In-memory store for whiteboards (as requested)
const roomWhiteboards: Record<string, Stroke[]> = {};

export function handleWhiteboardEvents(
    io: Server<ClientEvents, ServerEvents>,
    socket: Socket<ClientEvents, ServerEvents>,
    data: { roomId: string; participantId: string }
) {
    const { roomId } = data;

    // Send initial state on join (this might be redundant if we do it in room:joined, 
    // but the user asked for it in room:join. However, room:join is handled elsewhere.
    // We can send it immediately upon connection/handler registration if we want, 
    // or listen to a specific event. The user's snippet used 'room:join'.
    // Since we are inside the connection handler, we can just emit the state now.)
    if (roomWhiteboards[roomId]) {
        socket.emit('whiteboard:state', roomWhiteboards[roomId]);
    }

    socket.on('whiteboard:request-state', (targetRoomId) => {
        if (targetRoomId !== roomId) return;
        if (roomWhiteboards[roomId]) {
            socket.emit('whiteboard:state', roomWhiteboards[roomId]);
        }
    });

    socket.on('whiteboard:draw', ({ roomId: targetRoomId, stroke }) => {
        if (targetRoomId !== roomId) return;

        if (!roomWhiteboards[roomId]) roomWhiteboards[roomId] = [];
        roomWhiteboards[roomId].push(stroke);

        socket.to(roomId).emit('whiteboard:new-stroke', stroke);
    });

    socket.on('whiteboard:erase', ({ roomId: targetRoomId, strokeId }) => {
        if (targetRoomId !== roomId) return;

        if (roomWhiteboards[roomId]) {
            roomWhiteboards[roomId] = roomWhiteboards[roomId].filter((s) => s.id !== strokeId);
        }
        socket.to(roomId).emit('whiteboard:erase', strokeId);
    });

    socket.on('whiteboard:clear', (targetRoomId) => {
        if (targetRoomId !== roomId) return;

        roomWhiteboards[roomId] = [];
        io.to(roomId).emit('whiteboard:clear');
    });
}
