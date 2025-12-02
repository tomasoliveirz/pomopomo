export interface IRateLimiter {
    checkLimit(identifier: string, maxRequests?: number, windowMs?: number): Promise<boolean>;
}
