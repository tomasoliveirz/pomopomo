export interface ITimerScheduler {
    scheduleSegmentEnd(roomId: string, expectedIndex: number, delayMs: number): Promise<void>;
    cancelSegmentEnd(roomId: string, expectedIndex: number): Promise<void>;
    close(): Promise<void>;
}
