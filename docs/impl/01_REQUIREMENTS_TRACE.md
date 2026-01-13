# Requirements Trace

| Req ID | Description | Status | Impl Ref |
| --- | --- | --- | --- |
| **REL-0** | **Release 0: Foundation** | **In Progress** | |
| REL-0.A | Identity & Auth | **Parial** | `ws-token/route.ts`, `Actor` type |
| REL-0.B | Permissions | **Partial** | Needs verification |
| REL-0.C | Anti-abuse (Rate Limits/Turnstile) | **Missing** | `RedisRateLimiter.ts` exists but basic |
| REL-0.D | Event-driven Timer (No Scan) | **Missing** | `TimerWorker.ts` uses polling |
| REL-0.E | Write-behind (Redis -> Postgres) | **Missing** | Direct DB writes in `TimerWorker` |
| REL-0.F | Broadcast Storm Controls | **Partial** | Heartbeat exists, but transition logic naive |
