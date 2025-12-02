export interface IPresenceRepository {
    addPresence(roomId: string, participantId: string): Promise<void>;
    removePresence(roomId: string, participantId: string): Promise<void>;
    getPresence(roomId: string): Promise<string[]>;
    deleteRoomPresence(roomId: string): Promise<void>;
}
