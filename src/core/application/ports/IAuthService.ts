import { Role } from '../../domain/types';

export interface TokenPayload {
    roomId: string;
    sessionId: string;
    participantId: string;
    role: Role;
}

export interface IAuthService {
    generateToken(payload: TokenPayload): Promise<string>;
    verifyToken(token: string): Promise<TokenPayload | null>;
    generateSessionId(): string;
}
