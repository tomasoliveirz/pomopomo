export class RateLimitError extends Error {
    public readonly status = 429;
    public readonly retryAfterSec: number;

    constructor(message: string, retryAfterSec: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfterSec = retryAfterSec;
    }
}
