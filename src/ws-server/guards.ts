import { Socket } from 'socket.io';

export function requireUser(socket: Socket) {
    const data = socket.data as any;
    if (data.actor?.actorType !== 'user') {
        throw new Error('This action requires a registered user account');
    }
}

export function requireHost(socket: Socket) {
    const data = socket.data as any;
    if (data.roomRole !== 'host') {
        throw new Error('This action requires host permissions');
    }
}

// Example of how to use in handlers:
// socket.on('some:event', (data) => {
//   try {
//     requireUser(socket);
//     // ... logic
//   } catch (e: any) {
//     socket.emit('error', { message: e.message });
//   }
// });
