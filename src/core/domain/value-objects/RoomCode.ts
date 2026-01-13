import { customAlphabet } from 'nanoid';

// ABCDEFGHJKMNPQRSTVWXYZ (Crockford Base32) + 0-9. No I, L, O, U to avoid confusion.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const generateCode = customAlphabet(ALPHABET, 4);

export class RoomCode {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    public static create(value: string): RoomCode {
        const normalized = RoomCode.normalize(value);
        return new RoomCode(normalized);
    }

    public static generate(): RoomCode {
        return new RoomCode(generateCode());
    }

    public static normalize(input: string): string {
        const raw = input.trim();
        const code = raw.toUpperCase().replace(/^POMO-/, '');

        // Final regex validation: must be 4 characters, alphanumeric
        if (!/^[A-Z0-9]{4}$/.test(code)) {
            throw new Error('Invalid room code format. Must be 4 characters (e.g. ABCD).');
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
