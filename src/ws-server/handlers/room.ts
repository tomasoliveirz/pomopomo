import { Server, Socket } from 'socket.io';
import { UpdateRoomPrefsUseCase } from '../../core/application/use-cases/UpdateRoomPrefsUseCase';
import type { ClientEvents, ServerEvents } from '../../types';
import { Theme } from '../../core/domain/types';
import { requireHost } from '../guards';

export function handleRoomEvents(
  io: Server<ClientEvents, ServerEvents>,
  socket: Socket,
  data: any, // Using any for now to avoid circular dependency or just use the fields
  dependencies: {
    updateRoomPrefsUseCase: UpdateRoomPrefsUseCase;
  }
) {
  const { roomId } = socket.data;
  const { updateRoomPrefsUseCase } = dependencies;

  socket.on('prefs:update', async (updateData) => {
    try {
      requireHost(socket);

      if (updateData.theme) {
        await updateRoomPrefsUseCase.execute({
          roomId,
          theme: updateData.theme as Theme,
          role: socket.data.roomRole,
        });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to update preferences' });
    }
  });
}















