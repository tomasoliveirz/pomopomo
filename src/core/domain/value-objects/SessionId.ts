export class SessionId {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    public static create(value: string): SessionId {
        if (!value) {
            throw new Error('Session ID cannot be empty');
        }
        return new SessionId(value);
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: SessionId): boolean {
        return this.value === other.value;
    }
}
