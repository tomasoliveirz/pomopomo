# ITER-002 — Event-Driven Timer Refactor
Date: 2026-01-13 | Status: planned

## Docs read
- `src/infrastructure/ws/TimerWorker.ts`: Identified polling loop (1s interval).
- `src/infrastructure/db/redis/RedisStateRepository.ts`: Existing Redis infra.
- `package.json`: Checked dependencies.

## Goal / Non-goals
**Goal:** Replace polling loop with precise, scalable BullMQ delayed jobs (`REL-0.D`).
**Non-goals:** Changing client-side timer logic.

## Plan

### Architecture: BullMQ Delayed Jobs
We will schedule a "wake-up" job exactly when a segment is supposed to end.

1.  **TimerQueue**: `timer-transitions` stored in Redis.
2.  **Scheduler**: Adds `job` with `delay = remainingTime`.
3.  **Job ID Strategy**: `jobId = timer:${roomId}`.
    - **Enforces 1 job per room**.
    - If scheduling again (resume/skip), we **remove** the old job first, then add new one.
4.  **Processor**: Handles the job when it becomes due.
    - **Strict Validation**: Checks `room.status === 'running'` and `room.currentIndex === job.expectedIndex`.
    - **Hygiene**: `removeOnComplete: true`, `removeOnFail: true`.

### 1) Dependencies
- Run `npm install bullmq`.

### 2) Core: TimerScheduler Port
- `src/core/application/ports/ITimerScheduler.ts`:
  ```typescript
  export interface ITimerScheduler {
    scheduleSegmentEnd(roomId: string, expectedIndex: number, delayMs: number): Promise<void>;
    cancelSegmentEnd(roomId: string): Promise<void>;
  }
  ```

### 3) Infrastructure: BullMQ Implementation
- **Scheduler**: `src/infrastructure/jobs/bullmq/BullTimerScheduler.ts`
  - Implements `scheduleSegmentEnd` using `queue.add(..., { delay, jobId })`.
  - Implements `cancelSegmentEnd` using `queue.remove(jobId)`.
- **Processor**: `src/infrastructure/jobs/bullmq/TimerProcessor.ts`
  - Logic extracted from `TimerWorker.ts`.
  - Validates state before processing.
  - Updates DB/Redis and emits events via `IRoomEventsBus`.

### 4) Integration: TimerService
- Update `src/core/application/use-cases/TimerService.ts`.
- In `start()`: `scheduler.scheduleSegmentEnd(...)`.
- In `pause()`: `scheduler.cancelSegmentEnd(...)`.
- In `skip()`: `scheduler.cancelSegmentEnd(...)` (then handle logic).

### 5) Worker Process
- Create `src/worker/index.ts` separate from the main app.
- Initialize `TimerProcessor` in this worker process.
- Support `TIMER_MODE=polling|bullmq` feature flag for rollback.

## Verification Plan

### Automated Tests
- **Integration Test**:
  1. Start a room timer.
  2. Verify a job is added to BullMQ (inspect Redis or mock).
  3. Verify Room state advances after delay.

### Manual Verification
1.  **Start Timer**: Start a 5-second timer.
2.  **Check Logs**: Confirm "Job scheduled" log.
3.  **Wait**: Wait 5 seconds.
4.  **Verify Transition**: Confirm Room automatically transitions to Break without browser refresh (WS push).
5.  **Pause/Resume**: Pause at 2s, wait 5s (should NOT transition), Resume (should transition after remaining 2s).
6.  **Concurrency**: Open multiple tabs, ensure synchronized transition.

## Blocking questions
- None. Proceeding with implementation.
