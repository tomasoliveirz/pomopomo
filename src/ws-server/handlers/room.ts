import { Server, Socket } from 'socket.io';
import { UpdateRoomPrefsUseCase } from '../../core/application/use-cases/UpdateRoomPrefsUseCase';
import type { ClientEvents, ServerEvents } from '../../types';
import { Theme } from '../../core/domain/types';

interface SocketData {
  payload: any;
  roomId: string;
  participantId: string;
}

export function handleRoomEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: SocketData,
  dependencies: {
    updateRoomPrefsUseCase: UpdateRoomPrefsUseCase;
  }
) {
  const { roomId, payload } = data;
  const { updateRoomPrefsUseCase } = dependencies;

  socket.on('prefs:update', async (updateData) => {
    try {
      if (updateData.theme) {
        await updateRoomPrefsUseCase.execute({
          roomId,
          theme: updateData.theme as Theme,
          role: payload.role,
        });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to update preferences' });
    }
  });
}















