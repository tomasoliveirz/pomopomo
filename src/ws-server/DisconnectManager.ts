import { Socket } from 'socket.io';

type DisconnectCallback = () => Promise<void>;

export class DisconnectManager {
    private connections = new Map<string, number>(); // participantId -> count
    private timeouts = new Map<string, NodeJS.Timeout>(); // participantId -> timeout

    constructor(private gracePeriodMs: number = 30000) { }

    onConnect(participantId: string) {
        // Clear any pending disconnect timeout
        if (this.timeouts.has(participantId)) {
            clearTimeout(this.timeouts.get(participantId));
            this.timeouts.delete(participantId);
            console.log(`🔌 [DisconnectManager] Cancelled disconnect for ${participantId} (reconnected)`);
        }

        // Increment connection count
        const currentCount = this.connections.get(participantId) || 0;
        this.connections.set(participantId, currentCount + 1);
        console.log(`🔌 [DisconnectManager] ${participantId} connected. Count: ${currentCount + 1}`);
    }

    onDisconnect(participantId: string, callback: DisconnectCallback) {
        const currentCount = this.connections.get(participantId) || 0;

        if (currentCount <= 1) {
            this.connections.delete(participantId);

            // Schedule disconnect callback
            console.log(`🔌 [DisconnectManager] ${participantId} disconnected (last connection). Scheduling cleanup in ${this.gracePeriodMs}ms...`);

            const timeout = setTimeout(async () => {
                console.log(`🔌 [DisconnectManager] Executing cleanup for ${participantId}`);
                this.timeouts.delete(participantId);
                try {
                    await callback();
                } catch (error) {
                    console.error(`❌ [DisconnectManager] Error in disconnect callback for ${participantId}:`, error);
                }
            }, this.gracePeriodMs);

            this.timeouts.set(participantId, timeout);
        } else {
            this.connections.set(participantId, currentCount - 1);
            console.log(`🔌 [DisconnectManager] ${participantId} disconnected. Remaining connections: ${currentCount - 1}`);
        }
    }
}
