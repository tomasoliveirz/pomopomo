export class RoomCode {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    public static create(value: string): RoomCode {
        if (!value || value.length < 3) {
            throw new Error('Room code must be at least 3 characters long');
        }
        return new RoomCode(value);
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: RoomCode): boolean {
        return this.value === other.value;
    }
}
