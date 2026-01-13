import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32 (no I, L, O, U)
const generateCode = customAlphabet(ALPHABET, 4);

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

    public static generate(): RoomCode {
        return new RoomCode(generateCode());
    }

    public static normalize(input: string): string {
        let code = input.trim().toUpperCase();
        if (code.startsWith('POMO-')) {
            code = code.slice(5);
        }
        // Allow alphanumeric to support legacy codes (which might have L/U)
        if (!/^[A-Z0-9]{4}$/.test(code)) {
            // We could throw here, or just let it pass and fail at DB lookup if invalid.
            // But for "normalization" usually we just clean up.
            // If strict validation is needed, we can add it.
            // The user suggested throwing on invalid chars.
            // Let's throw if it doesn't look like a code at all.
            throw new Error('Invalid room code format');
        }
        return code;
    }

    public toString(): string {
        return this.value;
    }

    public equals(other: RoomCode): boolean {
        return this.value === other.value;
    }
}
