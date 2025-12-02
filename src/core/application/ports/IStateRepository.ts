import { RoomStatus } from '../../domain/types';

export interface RoomTimerState {
    status: RoomStatus;
    currentIndex: number;
    segmentEndsAt: number | null;
    remainingSec: number;
    lastUpdateTime: number;
}

export interface IStateRepository {
    getRoomTimerState(roomId: string): Promise<RoomTimerState | null>;
    setRoomTimerState(roomId: string, state: RoomTimerState): Promise<void>;
    deleteRoomState(roomId: string): Promise<void>;
}
